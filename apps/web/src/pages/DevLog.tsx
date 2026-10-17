import { useEffect, useState } from "react";
import { MarketingFooter, MarketingNav, PixelHeading, Reveal } from "../components/Marketing";
import { shouldShowVersions, VersionsModal } from "../components/VersionsModal";

/*
  Break-card sprites: hand-drawn frames laid out in one horizontal strip, played with hard cuts (no
  tweening) by stepping background-position. Each entry is ms per frame; the last frame holds longer.
*/
const SPRITES = {
  coffee: { frames: [180, 180, 180, 180, 180, 180, 180, 900], ratio: 132 / 286 },
  nap: { frames: [320, 320, 360, 420, 360, 360, 1800], ratio: 299 / 414 },
  kitkat: { frames: [380, 380, 380, 900], ratio: 392 / 471 },
} as const;
type SpriteName = keyof typeof SPRITES;

/** Loops a sprite strip frame by frame, only while it's on screen. */
function Sprite({ name, height }: { name: SpriteName; height: number }) {
  const { frames, ratio } = SPRITES[name];
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setFrame((current) => (current + 1) % frames.length), frames[frame]);
    return () => window.clearTimeout(timer);
  }, [visible, frame, frames]);
  return (
    <div
      ref={setNode}
      className="sprite"
      role="img"
      aria-label=""
      style={{
        height,
        width: Math.round(height * ratio),
        backgroundImage: `url(/art/devlog/sprite-${name}.png)`,
        backgroundSize: `${frames.length * 100}% 100%`,
        backgroundPosition: `${(frame / (frames.length - 1)) * 100}% 0`,
      }}
    />
  );
}

type Who = "Mayank" | "Ashima";
type Item =
  | { kind: "entry"; who: Who; at: string; text: string }
  | { kind: "break"; sprite: SpriteName; title: string; line: string };

const COFFEE: Item = { kind: "break", sprite: "coffee", title: "[ 8-bit Coffee Break ]", line: "Refueling algorithms & testing speech models..." };
const entry = (who: Who, at: string, text: string): Item => ({ kind: "entry", who, at, text });

const LOG: Item[] = [
  entry("Mayank", "Sep 25, 2026 · 09:15 AM", "scaffolded the monorepo — apps/api, apps/web, packages/core. basic Express + SQLite up."),
  entry("Ashima", "Sep 25, 2026 · 11:30 AM", "wrote the intent definitions — SPONSOR_LOOKUP, JOB_LOOKUP, the rest. keyword-based matching for now."),
  entry("Mayank", "Sep 25, 2026 · 02:50 PM", "pipeline stages wired: collect → normalize → dedupe → validate → rank. all still running on demo data."),
  COFFEE,
  entry("Ashima", "Sep 25, 2026 · 06:10 PM", "built the grounding rule — every field has to be a literal match to its source text. no exceptions, even if it means fewer results."),
  entry(
    "Mayank",
    "Sep 25, 2026 · 09:45 PM",
    "conflict resolution is live — when two sources disagree, it checks which one’s more recent and more authoritative. confident enough, it decides on its own. not confident, it leaves it for us to call.",
  ),
  entry("Ashima", "Sep 26, 2026 · 12:20 AM", "first live test: single Tavily search + one LLM call. found real sponsors off one Devfolio page. slow but it’s real data."),
  entry("Mayank", "Sep 26, 2026 · 03:00 AM", "tried scaling it up — multi-hop: find events, then extract sponsors per event, then enrich contacts. sounds right on paper."),
  { kind: "break", sprite: "nap", title: "[ Power Nap ]", line: "Recompiling brain cells between commits..." },
  entry("Ashima", "Sep 26, 2026 · 08:30 AM", "multi-hop is live. 8 events found... 1 sponsor extracted total. something’s badly wrong."),
  entry("Mayank", "Sep 26, 2026 · 11:15 AM", "found it — the search extraction doesn’t work on JS-heavy pages. Unstop and Devfolio were returning nothing."),
  entry("Ashima", "Sep 26, 2026 · 02:40 PM", "patched around it, widened the search. ran it again — full job failure this time. rate limited into the ground."),
  entry("Mayank", "Sep 26, 2026 · 05:20 PM", "wrapped every step so one failure can’t sink the whole job. stops the crash. doesn’t fix the real problem."),
  { kind: "break", sprite: "kitkat", title: "[ Snack Break ]", line: "{ status: 'compiling', patience: 'depleting' }" },
  entry("Mayank", "Sep 27, 2026 · 12:45 AM", "rebuild’s live. first real run: 111 sponsors, 63 seconds, every field grounded. audited 371 field values — zero ungrounded."),
  entry("Ashima", "Sep 27, 2026 · 09:30 AM", "started the frontend for real — Landing, Dashboard, Event Folder, Job Board, all wired to the live API instead of mocks."),
  entry("Mayank", "Sep 27, 2026 · 02:15 PM", "Job Board’s done — real dataset, real conflicts, Keep new/Keep previous actually calls the API. tested it end to end myself."),
  entry(
    "Ashima",
    "Sep 27, 2026 · 07:50 PM",
    "caught a data bug — re-running a job was throwing 37 conflicts, almost all of them just “Co-Sponsor” vs “Co-Sponsors.” normalized the comparison. down to 5 real ones.",
  ),
  entry("Mayank", "Sep 27, 2026 · 11:30 PM", "landing page and Why Dig page built out — full copy, the gem orbit, all the animations. flipped demo mode off, live data by default now."),
  COFFEE,
  entry("Ashima", "Sep 28, 2026 · 02:10 AM", "old conflicts were resurfacing on every re-run. fixed it — superseded properly now, nothing repeats."),
  entry("Mayank", "Sep 28, 2026 · 03:15 AM", "going through everything we half-built and finishing it properly — profile page, delete on records, the help widget."),
  entry("Ashima", "Sep 28, 2026 · 04:00 AM", "last stretch — Dev Log, the Stack page, a real usage guide, README updated. splitting - it’s all done before the sun’s up."),
];

export function DevLog() {
  const [versionsOpen, setVersionsOpen] = useState(false);
  // Opens half a second after load, so the page is never blocked while it loads.
  useEffect(() => {
    if (!shouldShowVersions()) return;
    const timer = window.setTimeout(() => setVersionsOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="landing mk-page">
      <MarketingNav />
      <header className="why-hero log-hero">
        <PixelHeading as="div" className="why-kicker" caret>
          DEV_LOG
        </PixelHeading>
        <h1 className="log-title">How Dig got dug — four days, two builders, every commit in between.</h1>
        <button type="button" className="px-btn versions-reopen" onClick={() => setVersionsOpen(true)}>
          v1 → v2
        </button>
      </header>
      {versionsOpen && <VersionsModal onClose={() => setVersionsOpen(false)} />}

      <main className="log">
        <Reveal className="log-frame">
          <h2>FIRST COMMIT: RESEARCHING...</h2>
          <p>
            Problem Statement 01 asked for a data intelligence platform — something that could find and structure information the
            internet already has, instead of making someone dig for it by hand. We started by looking at who does that digging
            today: event teams hunting sponsors and judges, job seekers checking listings one tab at a time, sales teams rebuilding
            lead lists that are already stale by the time they’re shared. Different people, same broken workflow. The harder
            question was trust — an AI that guesses at a company’s email isn’t useful, it’s just confidently wrong. So before
            writing a line of the pipeline, we set one rule: nothing ships unless we can point to the exact page it came from.
            Everything after this commit was in service of that rule.
          </p>
        </Reveal>

        {LOG.map((item, index) => {
          if (item.kind === "break") {
            return (
              <Reveal key={index} className="log-break">
                <Sprite name={item.sprite} height={item.sprite === "coffee" ? 96 : 110} />
                <b>{item.title}</b>
                <code>{item.line}</code>
              </Reveal>
            );
          }
          const side = item.who === "Mayank" ? "left" : "right";
          return (
            <Reveal key={index} className={`log-entry ${side}`}>
              <img className="log-avatar" src={`/art/devlog/avatar-${item.who.toLowerCase()}.png`} alt={item.who} />
              <div className="log-body">
                <div className="log-meta">
                  <b>{item.who}</b>
                  <span>{item.at}</span>
                </div>
                <p className="log-bubble">{item.text}</p>
              </div>
            </Reveal>
          );
        })}

        <Reveal className="term">
          <div className="term-bar">
            <i />
            <i />
            <i />
            <span>📁 dig — dig_status.log — 80×24</span>
          </div>
          <div className="term-body">
            <p className="term-dim">Last login: Mon Sep 28 04:00:00 on ttys000</p>
            <p>
              We rebuilt the core pipeline more times than we'd like to admit — searches that returned nothing, extractions that
              missed everything but one sponsor, a rate limit that took down an entire job. Every failure taught us something the
              last version didn't know. What's live now finds over a hundred real, sourced results in about a minute, with every
              field traced back to where it came from — no guesses, nothing we can't point to.
            </p>
            <p className="term-dim">
              Sep 28, 2026 · 04:00 AM <span className="term-cursor" />
            </p>
          </div>
        </Reveal>
      </main>
      <MarketingFooter />
    </div>
  );
}
