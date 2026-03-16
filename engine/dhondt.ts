import type {
  PartyId,
  PartyVotes,
  DHondtRound,
  DHondtResult,
  ElectionData,
  ElectionResult,
  SwingConfig,
} from "./types";

const PARTY_IDS: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA", "OTH"];
const LIST_SEATS_PER_REGION = 7;

export function allocateRegion(
  regionalListVotes: PartyVotes,
  constituencySeatsWon: PartyVotes,
): DHondtResult {
  const listSeats: PartyVotes = {};
  const rounds: DHondtRound[] = [];

  for (let round = 1; round <= LIST_SEATS_PER_REGION; round++) {
    const quotients: Partial<Record<PartyId, number>> = {};
    let bestParty: PartyId = "OTH";
    let bestQuotient = -1;

    for (const party of PARTY_IDS) {
      const votes = regionalListVotes[party] ?? 0;
      if (votes <= 0) continue;

      const constSeats = constituencySeatsWon[party] ?? 0;
      const listSeatsSoFar = listSeats[party] ?? 0;
      const divisor = constSeats + listSeatsSoFar + 1;
      const quotient = votes / divisor;
      quotients[party] = quotient;

      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestParty = party;
      }
    }

    listSeats[bestParty] = (listSeats[bestParty] ?? 0) + 1;
    rounds.push({
      round,
      quotients,
      winner: bestParty,
      winningQuotient: bestQuotient,
    });
  }

  return { listSeats, rounds };
}

export function getConstituencyWinner(votes: PartyVotes): PartyId {
  let bestParty: PartyId = "OTH";
  let bestVotes = -1;

  for (const party of PARTY_IDS) {
    const v = votes[party] ?? 0;
    if (v > bestVotes) {
      bestVotes = v;
      bestParty = party;
    }
  }

  return bestParty;
}

export function calculateElection(
  data: ElectionData,
  _swings?: SwingConfig,
): ElectionResult {
  const constituencySeats: PartyVotes = {};
  const listSeats: PartyVotes = {};
  const totalSeats: PartyVotes = {};
  const regionResults: ElectionResult["regionResults"] = {};

  for (const [regionName, region] of Object.entries(data.regions)) {
    const constituencyWinners: Record<string, PartyId> = {};
    const regionConstSeats: PartyVotes = {};

    // Determine constituency winners in this region
    for (const constName of region.constituencies) {
      const constituency = data.constituencies[constName];
      if (!constituency) continue;

      const winner = getConstituencyWinner(constituency.constituencyVotes);
      constituencyWinners[constName] = winner;
      regionConstSeats[winner] = (regionConstSeats[winner] ?? 0) + 1;
      constituencySeats[winner] = (constituencySeats[winner] ?? 0) + 1;
    }

    // Run D'Hondt for this region
    const dhondt = allocateRegion(region.regionalListVotes, regionConstSeats);

    // Accumulate list seats
    for (const party of PARTY_IDS) {
      const seats = dhondt.listSeats[party] ?? 0;
      if (seats > 0) {
        listSeats[party] = (listSeats[party] ?? 0) + seats;
      }
    }

    regionResults[regionName] = { dhondt, constituencyWinners };
  }

  // Calculate totals
  for (const party of PARTY_IDS) {
    const c = constituencySeats[party] ?? 0;
    const l = listSeats[party] ?? 0;
    if (c + l > 0) {
      totalSeats[party] = c + l;
    }
  }

  return { constituencySeats, listSeats, totalSeats, regionResults };
}
