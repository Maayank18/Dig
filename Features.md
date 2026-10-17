# Dig · Comprehensive Feature Specification & Architecture Guide

> **"We dig the internet for you, so you don't have to."**  
> Dig is an autonomous, source-grounded research pipeline that transforms natural-language prompts into verified, living, structured intelligence datasets. Unlike conventional scraping tools that scrape indiscriminately or generative AI chatbots that hallucinate plausible-sounding contacts, Dig guarantees 100% literal source-grounding: every data point is verified verbatim against its primary web citation, contacts are cross-matched by name and organization, and re-running a search diffs what changed instead of rebuilding from scratch.

---

## Table of Contents

1. [Executive Summary & Core Architectural Principles](#1-executive-summary--core-architectural-principles)
2. [The 10-Stage Autonomous Research Pipeline (Pipeline v2)](#2-the-10-stage-autonomous-research-pipeline-pipeline-v2)
3. [Supported Research Verticals & Schema Definitions](#3-supported-research-verticals--schema-definitions)
4. [Dual-Verified Contact Resolution & Corporate Tree Expansion](#4-dual-verified-contact-resolution--corporate-tree-expansion)
5. [Event Workspaces & Integrated Outreach CRM](#5-event-workspaces--integrated-outreach-crm)
6. [The Executive Toolkit Suite](#6-the-executive-toolkit-suite)
   - [Kickoff Planner](#61-kickoff-planner)
   - [Lens Intelligence Engine](#62-lens-intelligence-engine)
   - [Merger Engine](#63-merger-engine)
   - [Flow Graph Studio](#64-flow-graph-studio)
7. [Multi-Format Export & Publication Engine](#7-multi-format-export--publication-engine)
8. [User Experience, Micro-Interactions & Accessibility](#8-user-experience-micro-interactions--accessibility)
9. [Production Architecture & Security Specifications](#9-production-architecture--security-specifications)
10. [Design Boundaries & Prototype Transparency](#10-design-boundaries--prototype-transparency)

---

## 1. Executive Summary & Core Architectural Principles

Organizers, growth leads, researchers, and event operators lose between 4 to 8 hours per project conducting repetitive, manual web searches. The status quo suffers from three critical failure modes:
1. **15-Tab Research Fatigue**: Manually jumping between platforms (Google, Devfolio, Unstop, Wellfound, LinkedIn, G2), copying names into spreadsheets that rot within weeks.
2. **The Chatbot Hallucination Trap**: Asking general LLMs yields fluent, well-formatted answers containing non-existent email addresses, phantom sponsor partnerships, and hallucinated titles.
3. **The Duplication Penalty**: Re-verifying a list requires repeating the manual search from scratch, creating fragmented spreadsheet copies with no audit trail.

Dig solves this through three non-negotiable architectural tenets:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DIG THREE PILLARS OF TRUST                        │
├─────────────────────────┬────────────────────────┬─────────────────────┤
│ 1. ZERO HALLUCINATION   │ 2. DUAL-VERIFIED MATCH │ 3. LIVING DIFFS     │
│ Every field value must  │ Profiles & emails are  │ Re-running queries  │
│ exist verbatim in the   │ mapped only when name  │ compares against    │
│ primary source DOM text.│ AND company match.     │ history, auto-      │
│ No synthetic guesses.   │ No single-name leaps.  │ resolving conflicts.│
└─────────────────────────┴────────────────────────┴─────────────────────┘
```

---

## 2. The 10-Stage Autonomous Research Pipeline (Pipeline v2)

```
                            NATURAL LANGUAGE QUERY INPUT
                                         │
    ┌────────────────────────────────────┴────────────────────────────────────┐
    ▼                                                                         ▼
[ STAGE 1: INTENT & ENTITY ROUTING ]                        [ INTENT GUARDRAILS ]
(Groq / OpenAI LLM + Keyword Fallback)                    (Transparent out-of-scope notice)
    │
    ▼
[ STAGE 2: TARGETED MULTI-QUERY SEARCH ]
(Tavily live crawl with platform whitelisting)
    │
    ▼
[ STAGE 3: MULTI-LANE EXTRACTION ]
(Token-bucket rate-limit distributed workers)
    │
    ▼
[ STAGE 4: LITERAL SUBSTRING GROUNDING ]
(Drop non-verbatim claims; prevent domain-as-email hijacking)
    │
    ▼
[ STAGE 5: TIME-BOXED MULTI-MODAL ENRICHMENT ]
(Parallel LinkedIn/GitHub double-match + Hunter.io corporate email discovery)
    │
    ▼
[ STAGE 6: AUTONOMOUS DESCRIPTION QUOTATION ]
(Backfill empty descriptions using verbatim quotes from primary pages)
    │
    ▼
[ STAGE 7: JEV SEMANTIC EVIDENCE AUDIT ]
(OpenRouter Jev model; auto-containment & confidence scoring)
    │
    ▼
[ STAGE 8: NORMALIZATION, DEDUPE & VALIDATION ]
(Canonical entity ID resolution, Zod schema contracts)
    │
    ▼
[ STAGE 9: COMPLETENESS-BIASED RANKING ]
(Multi-variable scoring: completeness > recency > corroboration > authority)
    │
    ▼
[ STAGE 10: SNAPSHOT DIFFING & CONFLICT ENGINE ]
(Living dataset diffs: added, changed, unchanged, or needs review)
```

### Detailed Pipeline Breakdown:

1. **Stage 1: Intent & Entity Routing** (`packages/core/src/intents.ts`)  
   Parses free-form prompts into one of five structured query blueprints (`SPONSOR_LOOKUP`, `JUDGE_LOOKUP`, `JOB_LOOKUP`, `LEAD_LOOKUP`, `COMPETITOR_LOOKUP`). Extracts primary entities, locations, and search domains using Groq high-speed reasoning with an immediate regex keyword fallback.
2. **Stage 2: Targeted Multi-Query Web Search** (`apps/api/src/collect-live.ts`)  
   Executes multiple parallel search queries via Tavily with domain whitelists customized to the intent (e.g., Unstop, Devfolio, HackerEarth for hackathons; Wellfound, YC Work at a Startup for jobs; G2 and Product Hunt for competitors).
3. **Stage 3: Multi-Lane Extraction** (`apps/api/src/collect-live.ts`)  
   Converts unstructured HTML and raw page markdown into candidate structured records. Extraction is distributed across token-bucket model lanes (`gpt-oss-120b`, `gpt-oss-20b`) to dynamically absorb HTTP 429 rate limits without stalling active searches.
4. **Stage 4: Literal Substring Grounding** (`packages/core/src/validate.ts`)  
   **The anti-hallucination firewall.** Every candidate field is checked against the raw text of the cited source webpage. If a value does not appear word-for-word (case-insensitive) in the source text, it is discarded. If the primary entity name is not found on the page, the entire row is dropped. Website domain names are programmatically prevented from being incorrectly classified as personal emails.
5. **Stage 5: Parallel Time-Boxed Multi-Modal Enrichment** (`packages/core/src/enrichment/`)  
   Runs bounded, non-blocking parallel lookups:
   - **LinkedIn & GitHub**: Resolves profiles via `links.ts`.
   - **Corporate Work Emails**: Fetches publicly verified corporate emails via Hunter.io API with persistent disk caching.
6. **Stage 6: Autonomous Contextual Description Backfill** (`packages/core/src/enrichment/describe.ts`)  
   Eliminates empty table columns. When a company's "What they do" or an expert's "Expertise" is blank, Dig pulls an exact summary sentence from the entity's official domain or Wikipedia summary, wraps it in quotation marks, and cites that specific page as a secondary provenance source.
7. **Stage 7: Jev Semantic Evidence Auditing** (`packages/core/src/jev.ts`)  
   An AI reasoning auditor (powered by Jev via OpenRouter) assesses credibility, verifies evidence freshness, and resolves containment overlaps. If one source states `"IBM"` and another states `"Engineering & AI Leader, IBM"`, Dig automatically keeps the richer value.
8. **Stage 8: Normalization, Canonical Deduplication & Schema Validation** (`packages/core/src/normalize.ts`, `dedupe.ts`)  
   Standardizes casing, phone formats, URLs, and timestamps. Identifies duplicate corporate identities across differing source representations and validates output against strict Zod runtime schemas (`@dig/schemas`).
9. **Stage 9: Completeness-Biased Scoring & Multi-Factor Ranking** (`packages/core/src/ranking.ts`)  
   Sorts results to prioritize actionable records: rows with verified emails, direct LinkedIn paths, and complete profiles rank highest. Source recency, multi-source corroboration, and domain authority break score ties.
10. **Stage 10: Snapshot Diffing & Conflict Resolution** (`packages/core/src/diff.ts`)  
    When a list is re-run, Dig compares the new findings with the previous snapshot. Rows are categorized as `added`, `changed`, `unchanged`, or `not found again`. Confident improvements are auto-resolved; ambiguous conflicts (<85% confidence) are flagged for human review.

---

## 3. Supported Research Verticals & Schema Definitions

Dig provides specialized extraction and schema contracts for five primary research intents:

| Vertical | Primary Entity | Core Schema Fields | Supported Target Domains |
| :--- | :--- | :--- | :--- |
| **Sponsors** | Company Name | Company · Event Name · Sponsorship Tier · Contact Person · Work Email · LinkedIn · Phone | Devfolio, Unstop, HackerEarth, Major League Hacking, Corporate Press Releases |
| **Judges, Mentors & Speakers** | Person Name | Full Name · Organization / Affiliation · Topic Expertise · Event · Email · LinkedIn · GitHub | Conference agendas, Luma, Eventbrite, Academic faculty directories, Scholar |
| **Jobs & Internships** | Role Title | Role Title · Employer · Location · Workplace Mode (Remote / Hybrid / On-site) · Email · LinkedIn | Wellfound, Y Combinator Jobs, Instahyre, Official Careers Portals |
| **B2B Leads** | Company Name | Company · Value Proposition / Category · Public Contact · Corporate Email · Phone · LinkedIn | Industry directories, Crunchbase, Wellfound, Product directories |
| **Competitors & Alternatives** | Competitor Name | Product / Company · Market Category · Pricing Signal · Official Domain · Email · LinkedIn | G2, Capterra, AlternativeTo, Product Hunt, Comparison reviews |

### Scope Guardrails:
If a user asks about **Events**, **Funding Programs**, or **Macro Market Trends**, Dig's intent parser transparently explains that these categories are currently in preview rather than synthesizing ungrounded estimates.

---

## 4. Dual-Verified Contact Resolution & Corporate Tree Expansion

Finding a name is only half the battle; finding actionable contact paths without guessing is what makes research valuable.

```
       CANDIDATE DISCOVERY (LinkedIn / GitHub Profile Resolution)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [ NAME + ORG MATCH ]               [ NAME-ONLY MATCH ]
                  │                               │
                  ▼                               ▼
         VERIFIED LINK BADGE              FADED "CHECK" BADGE
      (Immediate outreach safe)        (Requires manual confirmation)
```

- **Dual-Verification Matching Rule** (`packages/core/src/enrichment/links.ts`):  
  A LinkedIn or GitHub link is marked as verified only when **both the candidate's personal name AND their cited organization/event** match the profile metadata. If only the name matches, the link is rendered with a faded **"check"** badge, warning the operator to confirm before writing.
- **Interactive One-Click Fallback Discovery**:  
  When no profile URL can be verified with high confidence, the LinkedIn column renders a 1-click fallback button that launches a pre-filtered boolean search (`site:linkedin.com/in "Name" "Company"`) directly in a new tab.
- **Zero-Guess Email Acquisition**:  
  Dig never guesses permutations (e.g., `first.last@company.com`). Work emails are retrieved only when they appear verbatim on a public webpage or originate from Hunter.io's web-crawled database.
- **"Another Contact" Corporate Tree Expansion** (`apps/web/src/pages/JobBoard.tsx`):  
  If a primary corporate sponsor or lead contact fails to respond, operators can expand the company tree with a single click. Dig pulls alternate verified contacts at the same organization from cached enrichment data at zero additional API cost. Each secondary contact maintains their own independent outreach lifecycle, notes, and custom pitch.

---

## 5. Event Workspaces & Integrated Outreach CRM

Every search in Dig is organized into dedicated **Event Workspaces**, transforming isolated scraping into a collaborative command center.

### 1. Dynamic README Context Engine
Every workspace includes an **Event README** storing key metadata: event dates, target attendance, sponsor tier pricing, and team member identities. The README synchronizes the team and is ingested as factual context by the cold pitch drafter.

### 2. 4-Stage Outreach Lifecycle Tracker
Every record in a list is managed across four distinct pipeline states with live counter tabs above the data table:
- **`Not Contacted`**: Freshly discovered, verified leads awaiting review.
- **`Waiting`**: Outreach has been dispatched; awaiting reply.
- **`Interested`**: Confirmed positive response; ready for closing.
- **`Declined`**: Passed or budget exhausted; archived with notes.

### 3. Context-Aware Pitch Drafter (`packages/core/src/pitch.ts`)
Generates high-converting, personalized cold outreach emails from factual record data:
- Ingests the recipient's verified title and company, the event's README goals, and the sender's name and role.
- **Zero generic flattery**: Eliminates hallucinated compliments (`"I've been a huge fan of IBM for years"`). Focuses exclusively on mutual relevance.
- 1-click clipboard copy or direct launch into native email clients (`mailto:`).

### 4. Interactive Evidence & Source Auditing Drawer
Clicking any row opens an **Evidence Drawer** providing a complete audit trail:
- Displays literal quote snippets from the source document.
- Clickable primary URLs with timestamp verification.
- Domain authority ratings and veracity badges.

### 5. Table Customization & State Persistence
Features resizable column headers, instant multi-field searching, sorting, and bulk actions. Column widths and visibility preferences are saved in browser storage per intent type.

---

## 6. The Executive Toolkit Suite

The **Toolkit** is a suite of executive utilities designed for high-stakes project planning, dataset merging, analytical discovery, and multi-channel campaign orchestration.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DIG TOOLKIT SUITE                             │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│ 6.1 KICKOFF       │ 6.2 LENS          │ 6.3 MERGER     │ 6.4 FLOW      │
│ Algorithmic event │ Deep analytical   │ Cross-cohort   │ Multi-channel │
│ milestone planner │ intelligence per  │ dataset dedupe │ outreach plan │
│ linked to search. │ vertical & KPIs.  │ & consolidation│ & dispatch.   │
└───────────────────┴───────────────────┴────────────────┴───────────────┘
```

### 6.1 Kickoff Planner (`apps/web/src/pages/Kickoff.tsx`, `packages/core/src/kickoff.ts`)
An algorithmic event director that synthesizes a custom phased milestone roadmap:
- **Urgent-First Scheduling**: Adapts to the event deadline. When an event is 2 weeks away, kickoff prioritizes emergency sponsor pipelines; for first-time organizers, it prioritizes core scope decisions.
- **Direct-to-Search Query Launcher**: Every task item in the roadmap links directly to a pre-configured Dig search query. Clicking a task starts the research pipeline instantly.
- **Persistent State**: Checklist progress is saved directly to the event workspace.

### 6.2 Lens Intelligence Engine (`apps/web/src/pages/Lens.tsx`, `lens-insights.ts`)
A dedicated analytical intelligence engine providing deep statistical clarity tailored to each research vertical:
- **Sponsors Lens**: Sponsorship tier breakdowns, repeat sponsor discovery, named direct contact vs. generic inbox ratios.
- **Judges & Mentors Lens**: Topic expertise distribution, academia vs. industry ratio, verified contact reachability index.
- **Jobs Lens**: Remote vs. hybrid vs. on-site ratios, hiring volume leaderboards, geographic talent clusters.
- **Leads Lens**: Market segment distribution, high-intent priority queues.
- **Competitors Lens**: Pricing tier landscapes, category overlap matrices, most frequently compared solutions.
- **Executive Summaries & PDF Export**: Produces executive visual summaries and standalone Lens PDF dossiers.

### 6.3 Merger Engine (`apps/web/src/pages/Merger.tsx`)
Enables cross-cohort dataset consolidation:
- Combines disparate searches (e.g., combining 3 regional sponsor lists) into a single master sheet.
- **1-Click Deduplication Toggle**: Merges duplicate records across lists without losing notes or outreach history.
- **Outreach Filtering**: Segments merged records across outreach statuses (`Waiting`, `Interested`, etc.).

### 6.4 Flow Graph Studio (`apps/web/src/pages/Flow.tsx`)
A visual workflow canvas and multi-channel dispatch simulator:
- **Visual Graph Nodes**: Data Source $\rightarrow$ Filter $\rightarrow$ Grounding Gate $\rightarrow$ Multi-Channel Drafter $\rightarrow$ Human Approval Gate.
- **Multi-Channel Dispatch Studio**: Tailors distinct outreach pitches for:
  - **Email Channel**: Configurable via personal Google OAuth / Gmail, SMTP, or personal Resend API keys.
  - **WhatsApp Channel**: Dispatches personalized chats via Twilio API or Meta Cloud Business WABA.
  - **LinkedIn Channel**: Drafts personalized 300-character connection notes linked to personal sender headlines.
- **Safe Dry-Run Simulation**: Enables testing the pipeline with mock delivery receipts without sending live messages.

---

## 7. Multi-Format Export & Publication Engine

Dig ensures that extracted, verified data can be exported to any downstream system with zero loss of fidelity:

- **Structured Formats (Excel, CSV, JSON)**:  
  Exports all core data fields, complete source URLs, verification timestamps, team notes, and outreach lifecycle stages. Excel files are pre-formatted with frozen header panes and readable column auto-widths.
- **Monochrome Executive PDF Intelligence Report** (`apps/web/src/pages/dataset-pdf-report.ts`):  
  A publication-grade black-and-white executive report built with `jsPDF`:
  - Executive summary block with key metrics (total rows, verification rate, contact coverage).
  - Complete, professionally typeset table with clean column proportions.
  - Detailed Provenance & Citation Bibliography listing every source domain and verification timestamp.
  - Change Audit log showing items added or changed since the last snapshot.
- **Dedicated Lens Analytics PDF**:  
  Generates an executive analytical summary report ready for distribution to stakeholders and leadership.

---

## 8. User Experience, Micro-Interactions & Accessibility

Dig is designed for maximum clarity, professional utility, and speed:

- **Omnipresent Micro-Tip Design System** (`apps/web/src/components/Tip.tsx`):  
  Every interactive element, table column header, status pill, and KPI metric provides a 1-sentence plain-language explanation accessible via hover, keyboard focus (`Tab`), or touch.
- **Universal Keyboard Navigation & Dismissal** (`apps/web/src/components/EscapeCloses.tsx`):  
  All modals, preview drawers, and pop-ups close smoothly via the `Escape` key, header cancel buttons, or background clicks.
- **Diglett In-App Mascot Intelligence Assistant** (`apps/web/src/components/Diglett.tsx`):  
  An interactive retro-styled research assistant that answers questions about current lists, provides pipeline tips, and suggests next outreach steps.
- **Toolkit Onboarding & Version Modal** (`apps/web/src/components/ToolkitIntro.tsx`, `VersionsModal.tsx`):  
  Provides guided walkthroughs on first access and tracks the evolution of Dig from v1 to v2.
- **Transparent Pricing ROI Calculator** (`apps/web/src/pages/Pricing.tsx`):  
  An interactive calculator that estimates annual team hours saved and financial ROI based on explicit, transparent research assumptions.
- **Secure Local Credential Management**:  
  Personal API keys (Resend, Twilio, Google App Passwords) are encrypted and stored locally in the browser, complete with password visibility toggles.

---

## 9. Production Architecture & Security Specifications

Dig is engineered as a modern, high-performance monorepo:

```
apps/
  api/          Node.js 22 + Express API server with native node:sqlite
  web/          React 19 + Vite SPA with TanStack Table, Query & jsPDF
packages/
  core/         Research pipeline, Zod validation, Jev, Kickoff, Pitch rules
  schemas/      Universal data contracts and type definitions
  database/     SQLite schema migrations (WAL mode, foreign keys)
```

- **Zero-Native-Compile Database (`node:sqlite`)**:  
  Uses Node 22's built-in `DatabaseSync`, completely eliminating heavy native C++ build steps (like `node-gyp` or `better-sqlite3`). Boots instantaneously with Write-Ahead Logging (WAL) enabled.
- **Real-Time Pipeline Streaming**:  
  Server-Sent Events (SSE) stream research progress and live audit logs directly from the backend to the browser.
- **Comprehensive Test Suite**:  
  105+ unit and integration tests across `@dig/core` using `vitest`, covering grounding rules, deduplication, conflict logic, kickoff generation, and pitch synthesis.
- **Strict TypeScript Rigor**:  
  100% typechecked across all 4 monorepo packages (`npm run typecheck` produces 0 errors).
- **Deployment Topology**:  
  - **API**: Hosted on Railway with persistent volume storage mounted at `/data/dig.db`.
  - **Frontend**: Hosted on Vercel with automatic `/api/*` reverse-proxy routing to Railway.

---

## 10. Design Boundaries & Prototype Transparency

Dig maintains strict engineering integrity regarding what is live versus what is scoped as a prototype:

1. **Autonomous Outreach Safety**:  
   The Flow Graph Studio is a visual planner and simulator. To prevent spam and comply with messaging provider policies, simulated runs generate approval drafts rather than unsolicited bulk messages.
2. **Third-Party API Rate Limits**:  
   Hunter.io email discovery is subject to the active API key's rate limits (free tiers provide 50 requests/month). If quota is exceeded, Dig continues execution smoothly without failing the search.
3. **Dynamic Web Volatility**:  
   Web search results naturally fluctuate based on search engine index updates. Dig's snapshot diffing engine is specifically built to handle this by highlighting new, modified, or dropped citations across runs.

---

*Authored with precision by the Dig Core Team · Built for Code Cubicle 6.0*
