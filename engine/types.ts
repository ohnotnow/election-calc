export type PartyId = "SNP" | "CON" | "LAB" | "GRN" | "LD" | "REFORM" | "ALBA" | "OTH";

export interface PartyInfo {
  name: string;
  colour: string;
  shortName: string;
}

export const PARTIES: Record<PartyId, PartyInfo> = {
  SNP: { name: "SNP", colour: "#FDF38E", shortName: "SNP" },
  CON: { name: "Conservative", colour: "#0087DC", shortName: "Con" },
  LAB: { name: "Labour", colour: "#E4003B", shortName: "Lab" },
  GRN: { name: "Green", colour: "#00A651", shortName: "Grn" },
  LD: { name: "Liberal Democrat", colour: "#FAA61A", shortName: "LD" },
  REFORM: { name: "Reform UK", colour: "#12B6CF", shortName: "Ref" },
  ALBA: { name: "Alba", colour: "#005EB8", shortName: "Alba" },
  OTH: { name: "Other", colour: "#999999", shortName: "Oth" },
};

export type PartyVotes = Partial<Record<PartyId, number>>;

export interface ConstituencyResult {
  name: string;
  region: string;
  constituencyVotes: PartyVotes;
  regionalVotes: PartyVotes;
}

export interface RegionData {
  name: string;
  constituencies: string[];
  regionalListVotes: PartyVotes;
}

export interface ElectionData {
  constituencies: Record<string, ConstituencyResult>;
  regions: Record<string, RegionData>;
}

export interface DHondtRound {
  round: number;
  quotients: Partial<Record<PartyId, number>>;
  winner: PartyId;
  winningQuotient: number;
}

export interface DHondtResult {
  listSeats: PartyVotes;
  rounds: DHondtRound[];
}

export interface SwingConfig {
  national: PartyVotes;
  regional: Record<string, PartyVotes>;
  constituency: Record<string, PartyVotes>;
}

export interface ElectionResult {
  constituencySeats: PartyVotes;
  listSeats: PartyVotes;
  totalSeats: PartyVotes;
  regionResults: Record<
    string,
    {
      dhondt: DHondtResult;
      constituencyWinners: Record<string, PartyId>;
    }
  >;
}
