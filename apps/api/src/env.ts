import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "../../..");

function loadFile() {
  const file = path.join(repoRoot, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadFile();

function flag(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  pacingMs: Number(process.env.DEMO_STAGE_PACING_MS ?? 380),
  llmEnabled: flag("LLM_ENABLED", true),
  llmProvider: process.env.LLM_PROVIDER ?? "mock",
  llmKey: process.env.LLM_API_KEY ?? "",
  /** Groq keys in try-order. The primary key is first; the rest are used when it is rate-limited or rejected. */
  get llmKeys(): string[] {
    if (this.llmProvider !== "groq") return this.llmKey ? [this.llmKey] : [];
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const value of [
      this.llmKey,
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_FALLBACK,
      process.env.GROQ_API_KEY_FALLBACK_2,
      process.env.GROQ_API_KEY_FALLBACK_3,
      process.env.GROQ_API_KEY_FALLBACK_4,
    ]) {
      const key = value?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
    return keys;
  },
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  // Groq rate-limits tokens per minute per model, so extra models act as parallel lanes for batched extraction.
  llmExtraModels: (process.env.LLM_EXTRA_MODELS ?? (process.env.LLM_PROVIDER === "groq" ? "openai/gpt-oss-20b,qwen/qwen3.8-27b" : ""))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean),
  tavilyKey: process.env.TAVILY_API_KEY ?? process.env.SEARCH_API_KEY ?? "",
  // Results kept per run, for every intent. Sponsor/lead contact lookups (one Tavily credit each, cached 7 days)
  // follow the same cap.
  resultCap: Number(process.env.RESULT_CAP ?? 120),
  get sponsorEnrichLimit() {
    return this.resultCap;
  },
  threshold: Number(process.env.JEV_AUTO_THRESHOLD ?? 0.85),
  trustProvider: process.env.TRUST_PROVIDER ?? "jev",
  jevKey: process.env.JEV_API_KEY || process.env.OPENROUTER_API_KEY || "",
  jevBaseUrl: process.env.JEV_BASE_URL ?? "https://openrouter.ai/api/alpha/decisions",
  jevModel: process.env.JEV_MODEL ?? "typesafe/jev-1.13",
  hunterEnabled: flag("HUNTER_ENABLED", true),
  hunterKey: process.env.HUNTER_API_KEY ?? "",
  // 0 lifts the per-run cap. The live account balance is still respected.
  hunterMaxCallsPerRun: (() => {
    const raw = process.env.HUNTER_MAX_CALLS_PER_RUN;
    if (raw === undefined || raw.trim() === "") return 8;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 8;
  })(),
  githubEnabled: flag("GITHUB_ENABLED", true),
  // Fine-grained PAT, sent as Bearer. Dig only searches public users and reads public profiles.
  githubToken: process.env.GITHUB_TOKEN ?? "",
  pdlEnabled: flag("PDL_ENABLED", false),
  pdlKey: process.env.PDL_API_KEY ?? "",
  apolloEnabled: flag("APOLLO_ENABLED", false),
  apolloKey: process.env.APOLLO_API_KEY ?? "",
  emailConnector: process.env.EMAIL_CONNECTOR ?? "mock",
  whatsappConnector: process.env.WHATSAPP_CONNECTOR ?? "mock",
  linkedinConnector: process.env.LINKEDIN_CONNECTOR ?? "mock",
  enrichmentTimeoutMs: Number(process.env.ENRICHMENT_TIMEOUT_MS ?? 20_000),
  enrichmentCacheTtlMs: Number(process.env.ENRICHMENT_CACHE_TTL_MS ?? 0),
  get enrichmentConcurrency() {
    const base = Number(process.env.ENRICHMENT_CONCURRENCY ?? "");
    const pick = (name: string, fallback: number) => {
      const specific = Number(process.env[name] ?? "");
      return specific > 0 ? specific : fallback;
    };
    return {
      entities: pick("ENRICHMENT_ENTITY_CONCURRENCY", base > 0 ? base : 8),
      tavily: pick("TAVILY_CONCURRENCY", base > 0 ? base : 7),
      github: pick("GITHUB_CONCURRENCY", base > 0 ? Math.max(2, base - 2) : 5),
      hunter: pick("HUNTER_CONCURRENCY", base > 0 ? Math.min(2, base) : 2),
      pdl: pick("PDL_CONCURRENCY", base > 0 ? Math.max(2, Math.floor(base / 2)) : 3),
      apollo: pick("APOLLO_CONCURRENCY", base > 0 ? Math.max(2, Math.floor(base / 2)) : 3),
    };
  },
  databasePath: path.resolve(repoRoot, process.env.DATABASE_PATH ?? "data/dig.db"),
  // Contact-lookup cache: next to the database by default, so it sits on the same persistent volume.
  get cacheDir() {
    return path.resolve(repoRoot, process.env.CACHE_DIR ?? path.join(path.dirname(this.databasePath), "cache"));
  },
  schemaPath: path.join(repoRoot, "packages/database/schema.sql"),
};
