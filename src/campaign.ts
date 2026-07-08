import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createClient, type ZapierClient, type ActionResult } from "./zapier-client.js";
import { writeCampaignCopy } from "./llm.js";
import type { ProductRow } from "./types.js";

const GO_LIVE = process.env.GO_LIVE === "true";

function idOf(r: ActionResult): string {
  const d = r.data as { id?: string | number } | null;
  return d && !Array.isArray(d) && d.id != null ? String(d.id) : "";
}

async function getNextProduct(client: ZapierClient): Promise<ProductRow | null> {
  if (client.mode === "mock") {
    const url = new URL("../data/sample-queue.json", import.meta.url);
    const rows = JSON.parse(await readFile(url, "utf8")) as ProductRow[];
    return rows.find((r) => r.status === "new") ?? null;
  }
  // Live: read the next queued row from Google Sheets.
  const sheets = await client.findConnectionId("google-sheets");
  const { data } = await client.action(
    "google-sheets",
    "search",
    "find_row",
    {
      drive: "my-drive",
      spreadsheet: process.env.SHEET_ID,
      worksheet: "Queue",
      lookup_column: "status",
      lookup_value: "new",
    },
    sheets,
  );
  const row = Array.isArray(data) ? (data[0] as ProductRow) : (data as ProductRow);
  return row ?? null;
}

async function main() {
  const mode = process.env.MOCK === "false" ? "LIVE" : "MOCK";
  console.log(`\n🚀 Campaign Machine — mode=${mode}  go_live=${GO_LIVE}\n`);

  const client = await createClient();

  const product = await getNextProduct(client);
  if (!product) {
    console.log("Nothing queued (no row with status=new). Done.");
    return;
  }
  console.log(`📦 Product: ${product.product} — for ${product.audience}\n`);

  console.log("✍️  Writing platform-native copy (LLM)…");
  const copy = await writeCampaignCopy(product);
  console.log(`   LinkedIn: ${copy.linkedin.slice(0, 90)}…`);
  console.log(`   X thread: ${copy.x_thread.length} posts`);
  console.log(`   Email:    "${copy.email_subject}"\n`);

  console.log("🔗 Chaining apps through the Zapier SDK (auth handled by Zapier):");
  const [buffer, gmail, notion, slack, sheets] = await Promise.all([
    client.findConnectionId("buffer"),
    client.findConnectionId("gmail"),
    client.findConnectionId("notion"),
    client.findConnectionId("slack"),
    client.findConnectionId("google-sheets"),
  ]);

  // 1) Social: schedule (or publish) via Buffer
  const social = await client.action(
    "buffer",
    "write",
    "add_to_queue",
    {
      profile_ids: process.env.BUFFER_PROFILE_IDS ?? "demo-linkedin,demo-x",
      text: copy.linkedin,
      media_photo: product.image_url,
      now: GO_LIVE, // false ⇒ scheduled/queued (demo-safe)
    },
    buffer,
  );

  // 2) Email: create a DRAFT (safe to show)
  const draft = await client.action(
    "gmail",
    "write",
    "create_draft",
    {
      to: process.env.LIST_TEST_ADDR ?? "you@example.com",
      subject: copy.email_subject,
      body: copy.email_body,
    },
    gmail,
  );

  // 3) Content-calendar card
  await client.action(
    "notion",
    "write",
    "create_database_item",
    {
      database_id: process.env.NOTION_DB ?? "demo-db",
      title: `Launch: ${product.product}`,
      status: "Scheduled",
      channel: "LinkedIn / X / Email",
    },
    notion,
  );

  // 4) Notify the team (human-in-the-loop approval)
  await client.action(
    "slack",
    "write",
    "channel_message",
    {
      channel: process.env.SLACK_CHANNEL ?? "#launches",
      text:
        `*Campaign ready: ${product.product}*\n` +
        `• Social: ${idOf(social) || "scheduled"}\n` +
        `• Email draft: ${idOf(draft)}\n` +
        `• ${copy.x_thread.length}-post X thread queued\n` +
        `React ✅ to publish.`,
    },
    slack,
  );

  // 5) Close the loop: write status back to the sheet
  await client.action(
    "google-sheets",
    "write",
    "update_row",
    {
      spreadsheet: process.env.SHEET_ID ?? "demo-sheet",
      worksheet: "Queue",
      row_id: product.row_id,
      status: GO_LIVE ? "published" : "scheduled",
      social_id: idOf(social),
      email_draft_id: idOf(draft),
      processed_at: new Date().toISOString(),
    },
    sheets,
  );

  console.log("\n✅ Done: Sheets → Buffer → Gmail → Notion → Slack. Sheet row updated.");
  console.log("   5 apps. 1 script. 0 lines of OAuth.\n");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
