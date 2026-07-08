// Code by Zapier (JavaScript) — paste into a Code step behind a
// "Google Sheets → New Spreadsheet Row" trigger.
//
// The Zapier SDK is PRE-INSTALLED in Code by Zapier and `zapier` is a global
// (no createZapierSdk / no login here). Runtime can extend up to 10 minutes.
// `inputData` holds the fields you mapped from the trigger row.
//
// This mirrors src/campaign.ts but trimmed to what's clean to show in a Zap.

export default async function main({ inputData }) {
  // 1) Resolve connections (Zapier owns the tokens)
  const { data: slackConn } = await zapier.findFirstConnection({ appKey: "slack", owner: "me" });
  const { data: bufferConn } = await zapier.findFirstConnection({ appKey: "buffer", owner: "me" });

  const slack = zapier.apps.slack({ connectionId: slackConn.id });
  const buffer = zapier.apps.buffer({ connectionId: bufferConn.id });

  // 2) (Optional) call your LLM via fetch here to generate copy.
  const text = `New launch: ${inputData.product} — ${inputData.description} → ${inputData.link}`;

  // 3) Chain apps (add Gmail/Notion/Sheets exactly like src/campaign.ts)
  const { data: social } = await buffer.write.add_to_queue({
    inputs: {
      profile_ids: inputData.buffer_profile_ids,
      text,
      media_photo: inputData.image_url,
      now: false, // queue/draft; set true to publish
    },
  });

  const { data: posted } = await slack.write.channel_message({
    inputs: { channel: "#launches", text: `Campaign queued for ${inputData.product}` },
  });

  // 4) Return values become usable in later Zap steps
  return {
    product: inputData.product,
    social_id: social && social.id,
    slack_ts: posted && posted.id,
  };
}
