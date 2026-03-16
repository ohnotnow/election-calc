import { test, expect, describe } from "bun:test";
import { applySwing, createEmptySwing, getEffectiveSwing } from "./swing";
import { calculateElection } from "./dhondt";
import { electionData } from "../data/election2021";
import type { SwingConfig } from "./types";

describe("createEmptySwing", () => {
  test("returns empty config", () => {
    const swing = createEmptySwing();
    expect(swing.national).toEqual({});
    expect(swing.regional).toEqual({});
    expect(swing.constituency).toEqual({});
  });
});

describe("getEffectiveSwing", () => {
  test("national swing applies when no overrides", () => {
    const swing: SwingConfig = {
      national: { SNP: 5 },
      regional: {},
      constituency: {},
    };
    const effective = getEffectiveSwing(swing, "Glasgow", "Glasgow Central");
    expect(effective.SNP).toBe(5);
  });

  test("regional overrides national", () => {
    const swing: SwingConfig = {
      national: { SNP: 5 },
      regional: { Glasgow: { SNP: -3 } },
      constituency: {},
    };
    const effective = getEffectiveSwing(swing, "Glasgow", "Glasgow Central");
    expect(effective.SNP).toBe(-3);
  });

  test("constituency overrides regional", () => {
    const swing: SwingConfig = {
      national: { SNP: 5 },
      regional: { Glasgow: { SNP: -3 } },
      constituency: { "Glasgow Central": { SNP: 10 } },
    };
    const effective = getEffectiveSwing(swing, "Glasgow", "Glasgow Central");
    expect(effective.SNP).toBe(10);
  });

  test("per-party precedence is independent", () => {
    const swing: SwingConfig = {
      national: { SNP: 5, CON: 2 },
      regional: { Glasgow: { SNP: -3 } },
      constituency: {},
    };
    const effective = getEffectiveSwing(swing, "Glasgow", "Glasgow Central");
    expect(effective.SNP).toBe(-3); // regional override
    expect(effective.CON).toBe(2);  // national (no regional override for CON)
  });
});

describe("applySwing", () => {
  test("zero swing changes nothing", () => {
    const swing = createEmptySwing();
    const result = applySwing(electionData, swing);

    // Check a specific constituency stays the same
    const orig = electionData.constituencies["Airdrie"]!;
    const swung = result.constituencies["Airdrie"]!;
    expect(swung.constituencyVotes.SNP).toBe(orig.constituencyVotes.SNP);
    expect(swung.constituencyVotes.CON).toBe(orig.constituencyVotes.CON);
    expect(swung.constituencyVotes.LAB).toBe(orig.constituencyVotes.LAB);
  });

  test("zero swing produces same election result", () => {
    const swing = createEmptySwing();
    const swungData = applySwing(electionData, swing);
    const result = calculateElection(swungData);
    expect(result.totalSeats.SNP).toBe(63);
    expect(result.totalSeats.CON).toBe(31);
    expect(result.totalSeats.LAB).toBe(21);
    expect(result.totalSeats.GRN).toBe(10);
    expect(result.totalSeats.LD).toBe(4);
  });

  test("national swing increases party share", () => {
    const swing = createEmptySwing();
    swing.national.SNP = 5;
    const result = applySwing(electionData, swing);

    const orig = electionData.constituencies["Airdrie"]!;
    const swung = result.constituencies["Airdrie"]!;
    const origTotal = Object.values(orig.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
    const origPct = ((orig.constituencyVotes.SNP ?? 0) / origTotal) * 100;
    const swungTotal = Object.values(swung.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
    const swungPct = ((swung.constituencyVotes.SNP ?? 0) / swungTotal) * 100;

    // SNP % should have increased (approximately +5 points before renormalisation)
    expect(swungPct).toBeGreaterThan(origPct);
  });

  test("total turnout preserved per constituency", () => {
    const swing = createEmptySwing();
    swing.national.SNP = 5;
    swing.national.CON = -3;
    const result = applySwing(electionData, swing);

    for (const [name, orig] of Object.entries(electionData.constituencies)) {
      const origTotal = Object.values(orig.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
      const swungTotal = Object.values(result.constituencies[name]!.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
      expect(swungTotal).toBe(origTotal);
    }
  });

  test("vote percentages sum to 100% after swing", () => {
    const swing = createEmptySwing();
    swing.national.SNP = -10;
    swing.national.REFORM = 15;
    const result = applySwing(electionData, swing);

    for (const [name, c] of Object.entries(result.constituencies)) {
      const total = Object.values(c.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
      if (total === 0) continue;
      const pctSum = Object.values(c.constituencyVotes).reduce(
        (a, b) => a + ((b ?? 0) / total) * 100,
        0,
      );
      expect(pctSum).toBeCloseTo(100, 1);
    }
  });

  test("negative clamping prevents negative votes", () => {
    const swing = createEmptySwing();
    swing.national.LD = -50; // LD has ~5-7% in many seats, so -50 should clamp to 0
    const result = applySwing(electionData, swing);

    for (const c of Object.values(result.constituencies)) {
      expect(c.constituencyVotes.LD ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  test("new party (Reform) can be introduced via swing", () => {
    const swing = createEmptySwing();
    swing.national.REFORM = 15;
    const result = applySwing(electionData, swing);

    // Reform should now have votes in every constituency
    for (const c of Object.values(result.constituencies)) {
      const total = Object.values(c.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
      if (total > 0) {
        expect(c.constituencyVotes.REFORM ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
