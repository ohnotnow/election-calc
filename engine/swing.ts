import type {
  PartyId,
  PartyVotes,
  ElectionData,
  SwingConfig,
  ConstituencyResult,
  RegionData,
} from "./types";

const PARTY_IDS: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA", "OTH"];

export function createEmptySwing(): SwingConfig {
  return { national: {}, regional: {}, constituency: {} };
}

export function getEffectiveSwing(
  swing: SwingConfig,
  region: string,
  constituency: string,
): PartyVotes {
  const merged: PartyVotes = {};
  for (const party of PARTY_IDS) {
    // Constituency > Regional > National precedence (per party)
    const constSwing = swing.constituency[constituency]?.[party];
    const regSwing = swing.regional[region]?.[party];
    const natSwing = swing.national[party];

    const value = constSwing ?? regSwing ?? natSwing;
    if (value !== undefined) {
      merged[party] = value;
    }
  }
  return merged;
}

function applySwingToVotes(votes: PartyVotes, swing: PartyVotes): PartyVotes {
  // Convert to percentages
  const totalVotes = Object.values(votes).reduce((a, b) => a + (b ?? 0), 0);
  if (totalVotes === 0) return { ...votes };

  const pcts: Partial<Record<PartyId, number>> = {};
  for (const party of PARTY_IDS) {
    pcts[party] = ((votes[party] ?? 0) / totalVotes) * 100;
  }

  // Apply swing points
  for (const party of PARTY_IDS) {
    const s = swing[party];
    if (s !== undefined) {
      pcts[party] = (pcts[party] ?? 0) + s;
    }
  }

  // Clamp negatives to 0
  for (const party of PARTY_IDS) {
    if ((pcts[party] ?? 0) < 0) {
      pcts[party] = 0;
    }
  }

  // Renormalise to 100%
  const totalPct = PARTY_IDS.reduce((a, p) => a + (pcts[p] ?? 0), 0);
  if (totalPct > 0) {
    for (const party of PARTY_IDS) {
      pcts[party] = ((pcts[party] ?? 0) / totalPct) * 100;
    }
  }

  // Convert back to absolute votes, preserving total turnout
  const result: PartyVotes = {};
  let allocated = 0;
  const sorted = PARTY_IDS.filter(p => (pcts[p] ?? 0) > 0)
    .sort((a, b) => (pcts[b] ?? 0) - (pcts[a] ?? 0));

  for (let i = 0; i < sorted.length; i++) {
    const party = sorted[i]!;
    if (i === sorted.length - 1) {
      // Last party gets the remainder to preserve total exactly
      result[party] = totalVotes - allocated;
    } else {
      const v = Math.round((pcts[party]! / 100) * totalVotes);
      result[party] = v;
      allocated += v;
    }
  }

  return result;
}

export function applySwing(data: ElectionData, swing: SwingConfig): ElectionData {
  const newConstituencies: Record<string, ConstituencyResult> = {};

  for (const [name, constituency] of Object.entries(data.constituencies)) {
    const effectiveSwing = getEffectiveSwing(swing, constituency.region, name);

    newConstituencies[name] = {
      name: constituency.name,
      region: constituency.region,
      constituencyVotes: applySwingToVotes(constituency.constituencyVotes, effectiveSwing),
      regionalVotes: applySwingToVotes(constituency.regionalVotes, effectiveSwing),
    };
  }

  // Rebuild region data with new regional list vote totals
  const newRegions: Record<string, RegionData> = {};
  for (const [regionName, region] of Object.entries(data.regions)) {
    const effectiveSwing = getEffectiveSwing(swing, regionName, "");
    newRegions[regionName] = {
      name: region.name,
      constituencies: [...region.constituencies],
      regionalListVotes: applySwingToVotes(region.regionalListVotes, effectiveSwing),
    };
  }

  return { constituencies: newConstituencies, regions: newRegions };
}
