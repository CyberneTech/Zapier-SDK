import "dotenv/config";

/**
 * Runtime discovery — the SDK's "don't hallucinate method names" best practice.
 * Lists an app's real actions and (optionally) an action's input schema.
 * Requires MOCK=false + `npx zapier-sdk login`.
 *
 *   npm run discover -- slack
 */
async function main() {
  const app = process.argv[2] ?? "slack";

  if (process.env.MOCK !== "false") {
    console.log("discover: MOCK is on. To hit the real API:");
    console.log("  1) npx zapier-sdk login");
    console.log("  2) MOCK=false npm run discover -- <app>   (e.g. buffer, google-sheets, gmail)");
    console.log("\nThis calls the real SDK:");
    console.log('  await zapier.listActions({ app })');
    console.log('  await zapier.getActionInputFieldsSchema({ app, actionType, action, connection })');
    return;
  }

  const { createZapierSdk } = await import("@zapier/zapier-sdk");
  const zapier = createZapierSdk();

  const { data: actions } = await zapier.listActions({ app });
  console.log(`\nActions for "${app}":`);
  for (const a of actions as Array<Record<string, unknown>>) {
    console.log(`  ${String(a.actionType)}.${String(a.key ?? a.actionKey)}  — ${String(a.noun ?? a.label ?? "")}`);
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
