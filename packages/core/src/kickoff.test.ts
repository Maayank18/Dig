import { describe, expect, it } from "vitest";
import { cleanKickoffPlan, kickoffUserMessage } from "./kickoff.js";

const today = new Date("2026-09-15T09:00:00Z");

const draft = {
  eventName: "Code Cubicle 7.0",
  eventDate: "2026-10-10",
  summary: "25 days left. Sponsors and venue first.",
  assumptions: ["About 300 students", ""],
  phases: [
    {
      title: "Do this week",
      start: "2026-09-15",
      end: "2026-09-21",
      tasks: [
        { title: "Shortlist judges", why: "They book up early.", due: "2026-09-19", search: { folder: "judges", query: "AI hackathon judges in Bangalore" } },
        { title: "Confirm the venue in writing", why: "Everything depends on it.", due: "2026-09-16", search: null },
        { title: "Book catering", why: "x", due: "2025-01-01", search: { folder: "caterers", query: "caterers" } },
        { title: "Late item", why: "x", due: "2027-01-01" },
      ],
    },
    { title: "Empty phase", tasks: [] },
  ],
};

describe("cleanKickoffPlan", () => {
  it("keeps a usable plan and works out the days left", () => {
    const plan = cleanKickoffPlan(draft, today)!;
    expect(plan).toMatchObject({ eventName: "Code Cubicle 7.0", eventDate: "2026-10-10", today: "2026-09-15", daysLeft: 25, urgent: true });
    expect(plan.assumptions).toEqual(["About 300 students"]);
    expect(plan.phases).toHaveLength(1);
  });

  it("orders tasks by date and keeps every due date between today and the event", () => {
    const tasks = cleanKickoffPlan(draft, today)!.phases[0]!.tasks;
    expect(tasks.map((task) => task.due)).toEqual(["2026-09-15", "2026-09-16", "2026-09-19", "2026-10-10"]);
  });

  it("offers a Dig search only for the five kinds Dig can run", () => {
    const tasks = cleanKickoffPlan(draft, today)!.phases[0]!.tasks;
    expect(tasks.find((task) => task.title === "Shortlist judges")?.search).toEqual({ folder: "judges", query: "AI hackathon judges in Bangalore" });
    expect(tasks.find((task) => task.title === "Book catering")?.search).toBeNull();
  });

  it("plans six weeks out when no date is given or the date has passed", () => {
    const plan = cleanKickoffPlan({ ...draft, eventDate: "2026-01-01" }, today)!;
    expect(plan).toMatchObject({ eventDate: "", daysLeft: null, urgent: false });
    expect(plan.phases[0]!.tasks.at(-1)?.due).toBe("2026-10-27");
  });

  it("returns null when nothing usable came back", () => {
    expect(cleanKickoffPlan(null, today)).toBeNull();
    expect(cleanKickoffPlan({ phases: [{ title: "x", tasks: [{ title: "" }] }] }, today)).toBeNull();
  });
});

describe("kickoffUserMessage", () => {
  it("gives the model today's date, the event, and the organizer's words", () => {
    const message = kickoffUserMessage({
      today,
      request: "It moved to 10 Oct. No sponsors yet.",
      event: { name: "Code Cubicle 7.0", date: "10 Oct", description: "AI hackathon", targets: "15 sponsors" },
    });
    expect(message).toContain("Today is 2026-09-15 (Tuesday).");
    expect(message).toContain("- date as written: 10 Oct");
    expect(message).toContain("No sponsors yet.");
  });
});
