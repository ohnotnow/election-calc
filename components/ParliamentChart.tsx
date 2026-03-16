import React from "react";
import type { PartyId, PartyVotes } from "../engine/types";
import { PARTIES } from "../engine/types";

interface ParliamentChartProps {
  seats: PartyVotes;
  baseSeats?: PartyVotes;
}

const PARTY_ORDER: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA", "OTH"];
const MAJORITY = 65;

// Distribute 129 seats across concentric arcs
const ROW_COUNTS = [18, 22, 26, 30, 33]; // = 129

function generateSeatPositions(): Array<{ x: number; y: number; row: number }> {
  const positions: Array<{ x: number; y: number; row: number }> = [];
  const cx = 250;
  const cy = 260;
  const rInner = 100;
  const rOuter = 240;
  const rowCount = ROW_COUNTS.length;

  for (let row = 0; row < rowCount; row++) {
    const count = ROW_COUNTS[row]!;
    const r = rInner + (rOuter - rInner) * (row / (rowCount - 1));

    for (let i = 0; i < count; i++) {
      // Angle from left (π) to right (0), i.e. top semicircle
      const angle = Math.PI - (i / (count - 1)) * Math.PI;
      positions.push({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
        row,
      });
    }
  }

  return positions;
}

const POSITIONS = generateSeatPositions();

export default function ParliamentChart({ seats, baseSeats }: ParliamentChartProps) {
  // Build flat array of party IDs for each seat
  const seatParties: PartyId[] = [];
  for (const party of PARTY_ORDER) {
    const count = seats[party] ?? 0;
    for (let i = 0; i < count; i++) {
      seatParties.push(party);
    }
  }

  // Build base seat array for change detection
  const baseSeatParties: PartyId[] = [];
  if (baseSeats) {
    for (const party of PARTY_ORDER) {
      const count = baseSeats[party] ?? 0;
      for (let i = 0; i < count; i++) {
        baseSeatParties.push(party);
      }
    }
  }

  const dotRadius = 7;

  return (
    <svg viewBox="0 0 500 280" style={{ width: "100%", maxWidth: 600, display: "block", margin: "0 auto" }}>
      {/* Majority line - vertical dashed at centre */}
      <line
        x1="250" y1="10" x2="250" y2="265"
        stroke="var(--text-muted)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.4"
      />
      <text x="250" y="8" textAnchor="middle" fill="var(--text-muted)" fontSize="9" opacity="0.6">
        {MAJORITY} for majority
      </text>

      {/* Seats */}
      {POSITIONS.map((pos, i) => {
        const party = seatParties[i];
        if (!party) return null;

        const colour = PARTIES[party].colour;
        const changed = baseSeats && i < baseSeatParties.length && baseSeatParties[i] !== party;

        return (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={dotRadius}
            fill={colour}
            opacity={0.9}
            stroke={changed ? "var(--text-primary)" : "none"}
            strokeWidth={changed ? 1.5 : 0}
          />
        );
      })}
    </svg>
  );
}
