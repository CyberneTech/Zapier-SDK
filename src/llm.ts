import type { Copy, ProductRow } from "./types.js";

const MOCK = process.env.MOCK !== "false";

/**
 * Model-flexible copywriter. In MOCK mode it returns deterministic copy so the
 * demo runs with zero API keys. Set MOCK=false + OPENAI_API_KEY to use a real model
 * (swap the endpoint/headers for Anthropic / Gemini / Kimi — that's the "bring any model" story).
 */
export async function writeCampaignCopy(p: ProductRow): Promise<Copy> {
  if (MOCK) return mockCopy(p);

  const prompt = `You are a senior marketing copywriter. Write launch copy for:
Product: ${p.product}
Description: ${p.description}
Audience: ${p.audience}
Link: ${p.link}
Return STRICT JSON: {"linkedin": string, "x_thread": string[] (each <=280 chars),
"email_subject": string, "email_body": string}. Tone: confident, concrete, no hype words.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(data.choices[0].message.content) as Copy;
}

function mockCopy(p: ProductRow): Copy {
  return {
    linkedin:
      `Meet ${p.product}. ${p.description} Built for ${p.audience}. ` +
      `We shipped it because the old way wasted hours every week. See it → ${p.link}`,
    x_thread: [
      `Introducing ${p.product} 🚀 ${p.description}`,
      `Who it's for: ${p.audience}. If that's you, this saves real time.`,
      `Try it today → ${p.link}`,
    ],
    email_subject: `${p.product} is here`,
    email_body:
      `Hi there,\n\nWe just launched ${p.product}. ${p.description}\n\n` +
      `It's built specifically for ${p.audience}.\n\nTake a look: ${p.link}\n\n— The team`,
  };
}
