import { env } from "./env.js";

/** Ready when a key is present. Dig does not call TinyFish unless something asks it to. */
export function tinyfishStatus(): "configured" | "missing" {
  return env.tinyfishKey ? "configured" : "missing";
}

/** Runs one blocking TinyFish browser task. The key stays in the request header and is never logged. */
export async function runTinyFish(input: { url: string; goal: string }): Promise<unknown> {
  if (!env.tinyfishKey) throw new Error("TINYFISH_API_KEY is not set");
  const response = await fetch(`${env.tinyfishBaseUrl}/v1/automation/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.tinyfishKey,
    },
    body: JSON.stringify({ url: input.url, goal: input.goal }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`TinyFish request failed (${response.status})`);
  return response.json();
}
