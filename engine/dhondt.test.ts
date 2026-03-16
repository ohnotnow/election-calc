import { test, expect, describe } from "bun:test";
import { allocateRegion, calculateElection, getConstituencyWinner } from "./dhondt";
import { electionData } from "../data/election2021";
import type { PartyVotes } from "./types";

describe("getConstituencyWinner", () => {
  test("returns party with most votes", () => {
    expect(getConstituencyWinner({ SNP: 1000, CON: 500, LAB: 300 })).toBe("SNP");
  });

  test("handles ties by party order", () => {
    const winner = getConstituencyWinner({ SNP: 1000, CON: 1000 });
    expect(["SNP", "CON"]).toContain(winner);
  });
});

describe("allocateRegion", () => {
  test("allocates 7 list seats", () => {
    const result = allocateRegion(
      { SNP: 100000, CON: 50000, LAB: 30000 },
      { SNP: 5 },
    );
    const totalSeats = Object.values(result.listSeats).reduce((a, b) => a + (b ?? 0), 0);
    expect(totalSeats).toBe(7);
    expect(result.rounds).toHaveLength(7);
  });

  test("party with zero votes gets no seats", () => {
    const result = allocateRegion(
      { SNP: 100000, CON: 50000, LAB: 0 },
      {},
    );
    expect(result.listSeats.LAB ?? 0).toBe(0);
  });

  test("Central and Lothians West matches spreadsheet", () => {
    // From spreadsheet: SNP 9 const seats, final list allocation: LAB 3, CON 3, GRN 1
    const result = allocateRegion(
      { SNP: 152792, CON: 63261, LAB: 77420, GRN: 21349, LD: 7376, ALBA: 5710, OTH: 11192 },
      { SNP: 9 },
    );
    expect(result.listSeats.LAB).toBe(3);
    expect(result.listSeats.CON).toBe(3);
    expect(result.listSeats.GRN).toBe(1);
    expect(result.listSeats.SNP ?? 0).toBe(0);
  });

  test("Highlands and Islands matches spreadsheet", () => {
    // SNP 6 const, LD 2 const. List: CON 4, SNP 1, LAB 1, GRN 1
    const result = allocateRegion(
      { SNP: 96463, CON: 60779, LAB: 22713, GRN: 17729, LD: 26771, ALBA: 3828, OTH: 10668 },
      { SNP: 6, LD: 2 },
    );
    expect(result.listSeats.CON).toBe(4);
    expect(result.listSeats.SNP).toBe(1);
    expect(result.listSeats.LAB).toBe(1);
    expect(result.listSeats.GRN).toBe(1);
  });
});

describe("calculateElection - full 2021 notional results", () => {
  const result = calculateElection(electionData);

  test("73 constituency seats total", () => {
    const total = Object.values(result.constituencySeats).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(73);
  });

  test("56 list seats total", () => {
    const total = Object.values(result.listSeats).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(56);
  });

  test("129 total seats", () => {
    const total = Object.values(result.totalSeats).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(129);
  });

  test("SNP wins 63 total seats", () => {
    expect(result.totalSeats.SNP).toBe(63);
  });

  test("Conservative wins 31 total seats", () => {
    expect(result.totalSeats.CON).toBe(31);
  });

  test("Labour wins 21 total seats", () => {
    expect(result.totalSeats.LAB).toBe(21);
  });

  test("Green wins 10 total seats", () => {
    expect(result.totalSeats.GRN).toBe(10);
  });

  test("Liberal Democrat wins 4 total seats", () => {
    expect(result.totalSeats.LD).toBe(4);
  });

  test("8 regions each have 7 D'Hondt rounds", () => {
    for (const [name, rr] of Object.entries(result.regionResults)) {
      expect(rr.dhondt.rounds).toHaveLength(7);
    }
  });

  test("every constituency has a winner", () => {
    for (const [regionName, rr] of Object.entries(result.regionResults)) {
      const region = electionData.regions[regionName]!;
      for (const constName of region.constituencies) {
        expect(rr.constituencyWinners[constName]).toBeDefined();
      }
    }
  });
});
