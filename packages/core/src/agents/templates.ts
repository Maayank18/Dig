import type { NodeConfig, NodeKind, WorkflowEdge, WorkflowGraph, WorkflowNode } from "./types.js";

function node(id: string, kind: NodeKind, label: string, y: number, config: NodeConfig, x = 80): WorkflowNode {
  return { id, kind, label, position: { x, y }, config };
}

function edge(source: string, target: string, sourceHandle?: WorkflowEdge["sourceHandle"]): WorkflowEdge {
  return { id: `${source}-${target}-${sourceHandle ?? "out"}`, source, target, sourceHandle };
}

function chain(nodes: WorkflowNode[], handles: Array<WorkflowEdge["sourceHandle"] | undefined> = []): WorkflowGraph {
  const edges = nodes.slice(1).map((item, index) => edge(nodes[index]?.id ?? "", item.id, handles[index]));
  return { nodes, edges };
}

/** Turn a top-to-bottom graph into columns, so a new workflow opens left to right with generous arrow gaps. */
function horizontal(graph: WorkflowGraph): WorkflowGraph {
  const bands = new Map<number, WorkflowNode[]>();
  for (const item of [...graph.nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)) {
    const key = Math.round(item.position.y / 50) * 50;
    bands.set(key, [...(bands.get(key) ?? []), item]);
  }
  const columns = [...bands.keys()].sort((a, b) => a - b);
  return {
    nodes: graph.nodes.map((item) => {
      const key = Math.round(item.position.y / 50) * 50;
      const column = columns.indexOf(key);
      const row = (bands.get(key) ?? []).findIndex((entry) => entry.id === item.id);
      return { ...item, position: { x: 60 + column * 380, y: 120 + row * 180 } };
    }),
    edges: graph.edges,
  };
}

function layoutGraph(graph: WorkflowGraph): WorkflowGraph {
  // Preserve custom layout coordinates (e.g. multi-channel branched trees or wide structured layouts)
  if (graph.nodes.some((item) => item.position.x > 80)) return graph;
  return horizontal(graph);
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  summary: string;
  graph: WorkflowGraph;
  status?: "active" | "coming_soon";
  badge?: string;
}

export function workflowTemplates(jobId = ""): WorkflowTemplate[] {
  const dataset = (x = 60, y = 140) => node("dataset", "dataset", "Dataset", y, { kind: "dataset", jobId }, x);
  const templates: WorkflowTemplate[] = [
    {
      id: "multi-channel-pitch",
      name: "Data Entry & Multi-Channel Pitch Drafter",
      summary: "Data entry node connects to Email, LinkedIn, and WhatsApp channels, each wired to personalized pitch drafters with approval before sending.",
      status: "active",
      badge: "Active",
      graph: {
        nodes: [
          node("dataset", "dataset", "Data Entry (Dataset)", 220, { kind: "dataset", jobId }, 60),
          node("email-channel", "filter", "Email Channel", 70, { kind: "filter", field: "email", op: "exists", value: "" }, 440),
          node("linkedin-channel", "filter", "LinkedIn Channel", 220, { kind: "filter", field: "linkedin", op: "exists", value: "" }, 440),
          node("whatsapp-channel", "filter", "WhatsApp Channel", 370, { kind: "filter", field: "phone", op: "exists", value: "" }, 440),
          node("email-approval", "approval", "Approve Email Pitch", 70, { kind: "approval" }, 820),
          node("linkedin-approval", "approval", "Approve LinkedIn Pitch", 220, { kind: "approval" }, 820),
          node("whatsapp-approval", "approval", "Approve WhatsApp Pitch", 370, { kind: "approval" }, 820),
          node("email-pitch", "email", "Email Pitch Drafter", 70, {
            kind: "email",
            from: "outreach@dig.ai",
            senderName: "Mayank Garg",
            provider: "Resend API (api.resend.com)",
            to: "{{record.email}}",
            subject: "Partnership Opportunity for {{record.company}}",
            body: "Hi {{record.name}},\n\nReaching out regarding {{record.company}} — we'd love to connect and share more about collaboration opportunities.\n\nBest regards,\nMayank Garg | Partnerships",
          }, 1200),
          node("linkedin-pitch", "linkedin", "LinkedIn Pitch Drafter", 220, {
            kind: "linkedin",
            from: "Mayank Garg (Founder & CEO)",
            provider: "LinkedIn Official Partner API",
            to: "{{record.linkedin}}",
            subject: "Connecting with {{record.name}}",
            body: "Hi {{record.name}}, I came across your work at {{record.company}} and would love to connect here on LinkedIn!",
          }, 1200),
          node("whatsapp-pitch", "whatsapp", "WhatsApp Pitch Drafter", 370, {
            kind: "whatsapp",
            from: "+1 (555) 019-2834 (Verified WABA)",
            provider: "Meta WhatsApp Cloud API (Graph API v21.0 / Meta Business Suite)",
            to: "{{record.phone}}",
            subject: "{{record.company}} Note",
            body: "Hello {{record.name}}, reaching out to you regarding {{record.company}}. Let us know if you'd be open to a brief chat!",
          }, 1200),
        ],
        edges: [
          edge("dataset", "email-channel"),
          edge("dataset", "linkedin-channel"),
          edge("dataset", "whatsapp-channel"),
          edge("email-channel", "email-approval"),
          edge("linkedin-channel", "linkedin-approval"),
          edge("whatsapp-channel", "whatsapp-approval"),
          edge("email-approval", "email-pitch"),
          edge("linkedin-approval", "linkedin-pitch"),
          edge("whatsapp-approval", "whatsapp-pitch"),
        ],
      },
    },
    {
      id: "list-and-send",
      name: "Email and message a list",
      summary: "Pick a research set, keep the rows that already have an email, approve that list, then preview an email and a message.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        node("dataset", "dataset", "Pick a set", 0, { kind: "dataset", jobId }),
        node("has-email", "filter", "People with an email", 110, { kind: "filter", field: "email", op: "exists", value: "" }),
        node("limit", "limit", "First 25", 220, { kind: "limit", count: 25 }),
        node("approval", "approval", "Approve the list", 330, { kind: "approval" }),
        node("email", "email", "Send email", 440, { kind: "email", to: "{{record.email}}", subject: "Hello {{record.company}}", body: "Hi {{record.name}},\n\nWriting to {{record.company}}." }),
        node("message", "whatsapp", "Send message", 550, { kind: "whatsapp", to: "{{record.phone}}", subject: "{{record.company}}", body: "Hi {{record.name}}, a short note for {{record.company}}." }),
        node("log", "log", "Done", 660, { kind: "log", message: "Prepared outreach for {{record.company}}." }),
      ]),
    },
    {
      id: "sponsor-outreach",
      name: "Sponsor Outreach",
      summary: "Verified, contactable sponsors, ranked, then approved before email.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: {
        nodes: [
          dataset(60, 140),
          node("filter", "filter", "Verified", 140, { kind: "filter", field: "status", op: "eq", value: "verified" }, 440),
          node("fit", "contactability", "Contactable", 140, { kind: "contactability", min: 80 }, 820),
          node("rank", "rank", "Rank", 140, { kind: "rank", field: "sponsorFit", direction: "desc" }, 1200),
          node("limit", "limit", "Top 10", 140, { kind: "limit", count: 10 }, 1580),
          node("approval", "approval", "Human approval", 140, { kind: "approval" }, 1960),
          node("email", "email", "Email", 140, { kind: "email", to: "{{record.email}}", subject: "{{record.company}} × Code Cube", body: "Hi {{record.name}},\n\nWe are inviting {{record.company}} to sponsor the event." }, 2340),
          node("delay", "delay", "Wait 3 days", 140, { kind: "delay", days: 3 }, 2720),
          node("reply", "condition", "Interested?", 140, { kind: "condition", field: "outreach_status", op: "eq", value: "interested" }, 3100),
          node("mark", "annotate", "Mark interested", 60, { kind: "annotate", field: "note", value: "Marked interested from the workflow." }, 3480),
          node("follow", "linkedin", "LinkedIn follow-up", 220, { kind: "linkedin", to: "{{record.linkedin}}", subject: "{{record.company}}", body: "Hi {{record.name}}, following up with {{record.company}}." }, 3480),
          node("log", "log", "Log", 140, { kind: "log", message: "Outreach step finished for {{record.company}}." }, 3860),
        ],
        edges: [
          edge("dataset", "filter"),
          edge("filter", "fit"),
          edge("fit", "rank"),
          edge("rank", "limit"),
          edge("limit", "approval"),
          edge("approval", "email"),
          edge("email", "delay"),
          edge("delay", "reply"),
          edge("reply", "mark", "yes"),
          edge("reply", "follow", "no"),
          edge("mark", "log"),
          edge("follow", "log"),
        ],
      },
    },
    {
      id: "lead-follow-up",
      name: "Email a list",
      summary: "Pick a set, keep rows with an email, cap the list, and hold it for approval before the email.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        dataset(),
        node("has-email", "filter", "Has email", 110, { kind: "filter", field: "email", op: "exists", value: "" }),
        node("limit", "limit", "Top 10", 220, { kind: "limit", count: 10 }),
        node("approval", "approval", "Human approval", 330, { kind: "approval" }),
        node("email", "email", "Email", 440, { kind: "email", to: "{{record.email}}", subject: "Hello {{record.company}}", body: "Hi {{record.name}},\n\nSharing a note for {{record.company}}." }),
        node("log", "log", "Log", 550, { kind: "log", message: "Follow-up prepared for {{record.company}}." }),
      ]),
    },
    {
      id: "contact-enrichment",
      name: "Contact Enrichment",
      summary: "Finds records that still have no contact path. It does not guess one.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        dataset(),
        node("enrich", "enrich", "Enrich", 110, { kind: "enrich" }),
        node("missing", "filter", "Still missing", 220, { kind: "filter", field: "contactability.score", op: "lte", value: "0" }),
        node("log", "log", "Log", 330, { kind: "log", message: "{{record.company}} still has no published contact path." }),
      ]),
    },
    {
      id: "dataset-refresh",
      name: "Dataset Refresh",
      summary: "Reads the current dataset again and logs the row count.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        node("rerun", "rerun", "Re-run research", 0, { kind: "rerun", jobId }),
        node("log", "log", "Log", 110, { kind: "log", message: "Refresh read {{record.company}}." }),
      ]),
    },
    {
      id: "new-record-alert",
      name: "New Record Alert",
      summary: "Keeps records added since the previous run.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        dataset(),
        node("changes", "changes", "New records", 110, { kind: "changes" }),
        node("log", "log", "Log", 220, { kind: "log", message: "New record: {{record.company}}." }),
      ]),
    },
    {
      id: "change-monitor",
      name: "Research Change Monitor",
      summary: "Compares the current version and keeps changed rows.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        node("compare", "compare", "Compare versions", 0, { kind: "compare", jobId }),
        node("changes", "changes", "Changes", 110, { kind: "changes" }),
        node("log", "log", "Log", 220, { kind: "log", message: "Changed: {{record.company}}." }),
      ]),
    },
    {
      id: "high-confidence",
      name: "Trusted list, then email",
      summary: "Keep trusted, verified rows, then wait for approval before the email.",
      status: "coming_soon",
      badge: "Coming Soon",
      graph: chain([
        dataset(),
        node("trust", "trust", "Trust check", 110, { kind: "trust" }),
        node("verified", "filter", "Verified", 220, { kind: "filter", field: "status", op: "eq", value: "verified" }),
        node("approval", "approval", "Human approval", 330, { kind: "approval" }),
        node("email", "email", "Email", 440, { kind: "email", to: "{{record.email}}", subject: "{{record.company}}", body: "Hi {{record.name}},\n\n{{record.company}} looks like a strong fit." }),
      ]),
    },
  ];
  return templates.map((item) => ({ ...item, graph: layoutGraph(item.graph) }));
}

export function templateById(id: string, jobId = ""): WorkflowTemplate | undefined {
  return workflowTemplates(jobId).find((item) => item.id === id);
}
