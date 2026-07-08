import "dotenv/config";

/**
 * Raw API escape hatch — for the ~3,000 apps/endpoints with no pre-built action.
 * The SDK signs the request with your stored connection; no keys in your code.
 * Correct signature: zapier.fetch(url, { connection, ...RequestInit }).
 * Requires MOCK=false + `npx zapier-sdk login`.
 */
async function main() {
  if (process.env.MOCK !== "false") {
    console.log("raw-fetch: MOCK is on. The real escape hatch looks like:");
    console.log('  const { data: conn } = await zapier.findFirstConnection({ appKey: "buffer", owner: "me" });');
    console.log('  const res = await zapier.fetch("https://api.bufferapp.com/1/profiles.json",');
    console.log('                                 { connection: String(conn.id), method: "GET" });');
    console.log("  console.log(await res.json());");
    return;
  }

  const { createZapierSdk } = await import("@zapier/zapier-sdk");
  const zapier = createZapierSdk();

  const { data: conn } = await zapier.findFirstConnection({ appKey: "buffer", owner: "me" });
  if (!conn) throw new Error("Connect Buffer first (or change the app).");

  const res = await zapier.fetch("https://api.bufferapp.com/1/profiles.json", {
    connection: String(conn.id),
    method: "GET",
  });
  console.log(await res.json());
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
