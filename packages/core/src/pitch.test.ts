import { describe, expect, it } from "vitest";
import { cleanPitch, pitchSupported, pitchUserMessage, recipientFacts } from "./pitch.js";

const sender = { name: "Ashima Arora", role: "Organizer", organization: "Code Cubicle", ask: "" };

describe("pitchSupported", () => {
  it("offers a pitch for sponsors, judges and leads only", () => {
    expect(pitchSupported("SPONSOR_LOOKUP")).toBe(true);
    expect(pitchSupported("JUDGE_LOOKUP")).toBe(true);
    expect(pitchSupported("LEAD_LOOKUP")).toBe(true);
    expect(pitchSupported("JOB_LOOKUP")).toBe(false);
    expect(pitchSupported("COMPETITOR_LOOKUP")).toBe(false);
  });
});

describe("pitchUserMessage", () => {
  it("sends only sourced facts, the event, and the sender", () => {
    const message = pitchUserMessage({
      intent: "JUDGE_LOOKUP",
      recipient: { person_name: "Alex Kuefler", affiliation: "Waymo", expertise: "reinforcement learning", email: "", source_url: "https://x" },
      event: { name: "Code Cubicle 7.0", date: "12 Nov", description: "A 36-hour student hackathon." },
      sender,
    });
    expect(message).toContain("Invite them to judge, mentor or speak");
    expect(message).toContain("expertise: reinforcement learning");
    expect(message).toContain("- name: Code Cubicle 7.0");
    expect(message).toContain("- name: Ashima Arora");
    expect(message).not.toContain("source_url");
    expect(message).not.toContain("what we are asking");
  });

  it("works without an event", () => {
    const message = pitchUserMessage({ intent: "LEAD_LOOKUP", recipient: { company_name: "Foxtale" }, event: null, sender: { ...sender, ask: "our analytics tool" } });
    expect(message).not.toContain("Our event");
    expect(message).toContain("what we are asking for or offering: our analytics tool");
  });
});

describe("recipientFacts", () => {
  it("skips empty fields", () => {
    expect(recipientFacts({ company_name: "Foxtale", category: " " })).toEqual(["company: Foxtale"]);
  });
});

describe("cleanPitch", () => {
  const body = "Hi Alex,\n\n\n\nI'm writing from Code Cubicle about judging our hackathon in November.";

  it("tidies a good draft", () => {
    expect(cleanPitch({ subject: " Judging  Code Cubicle ", body })).toEqual({
      subject: "Judging Code Cubicle",
      body: "Hi Alex,\n\nI'm writing from Code Cubicle about judging our hackathon in November.",
    });
  });

  it("rejects missing parts and leftover placeholders", () => {
    expect(cleanPitch(null)).toBeNull();
    expect(cleanPitch({ subject: "Hi", body: "short" })).toBeNull();
    expect(cleanPitch({ subject: "Judging", body: `${body} Date: [Event Date]` })).toBeNull();
  });
});
