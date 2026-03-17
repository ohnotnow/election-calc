import React, { useState, useMemo } from "react";
import type { PartyId, PartyVotes, SwingConfig, ElectionResult, ElectionData, DHondtRound } from "../engine/types";
import { PARTIES } from "../engine/types";
import { electionData } from "../data/election2021";
import { calculateElection } from "../engine/dhondt";
import { applySwing, createEmptySwing } from "../engine/swing";
import { getConstituencyWinner } from "../engine/dhondt";
import ParliamentChart from "./ParliamentChart";

export default function App() {
  const [swing, setSwing] = useState<SwingConfig>(createEmptySwing);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<string | null>(null);
  const [partyPerspective, setPartyPerspective] = useState<PartyId | null>(null);

  const swungData = useMemo(() => applySwing(electionData, swing), [swing]);
  const result = useMemo(() => calculateElection(swungData), [swungData]);
  const baseResult = useMemo(() => calculateElection(electionData), []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div>
          <h1 style={{ cursor: "pointer" }} onClick={() => setSelectedRegion(null)}>Scottish Parliament Election Calculator</h1>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Starting point: 2021 election results on the new 2026 constituency boundaries.
            Use the sliders below or enter polling figures to model "what if?" scenarios.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "nowrap" }}>
          <PollingPresets onApply={setSwing} />
          <PartySelector selected={partyPerspective} onSelect={setPartyPerspective} />
        </div>
      </header>

      <aside className="app-sidebar">
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
          Regions
        </div>
        <ul className="region-list">
          {Object.keys(electionData.regions).sort().map(name => (
            <li
              key={name}
              className={`region-item ${selectedRegion === name ? "active" : ""}`}
              onClick={() => {
                setSelectedRegion(selectedRegion === name ? null : name);
                setSelectedConstituency(null);
              }}
            >
              {name}
              <div className="seat-count">
                {electionData.regions[name]!.constituencies.length} constituencies
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="app-main">
        {!selectedRegion ? (
          <>
            <div className="card">
              <ParliamentChart seats={result.totalSeats} baseSeats={baseResult.totalSeats} />
            </div>
            {partyPerspective && (
              <PartyPerspectivePanel
                party={partyPerspective}
                result={result}
                baseResult={baseResult}
                data={swungData}
              />
            )}
            <div className="card">
              <h2>Parliament Composition</h2>
              <SeatSummary result={result} baseResult={baseResult} />
            </div>
          </>
        ) : (
          <RegionDetail
            regionName={selectedRegion}
            result={result}
            baseResult={baseResult}
            swungData={swungData}
            selectedConstituency={selectedConstituency}
            onSelectConstituency={setSelectedConstituency}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="card" style={{ margin: 0 }}>
          <h3>National Swing</h3>
          <SwingPanel swing={swing} onSwingChange={setSwing} />
        </div>
      </footer>
    </div>
  );
}

function SeatSummary({ result, baseResult }: { result: ElectionResult; baseResult: ElectionResult }) {
  const parties: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA"];

  return (
    <table className="seat-table">
      <thead>
        <tr>
          <th>Party</th>
          <th className="num">Const.</th>
          <th className="num">List</th>
          <th className="num">Total</th>
          <th className="num">+/-</th>
        </tr>
      </thead>
      <tbody>
        {parties.map(p => {
          const total = result.totalSeats[p] ?? 0;
          const base = baseResult.totalSeats[p] ?? 0;
          const change = total - base;
          if (total === 0 && base === 0) return null;

          return (
            <tr key={p}>
              <td className="party-name" style={{ color: PARTIES[p].colour }}>
                {PARTIES[p].name}
              </td>
              <td className="num">{result.constituencySeats[p] ?? 0}</td>
              <td className="num">{result.listSeats[p] ?? 0}</td>
              <td className="num" style={{ fontWeight: 700 }}>{total}</td>
              <td className={`num ${change > 0 ? "change-pos" : change < 0 ? "change-neg" : ""}`}>
                {change > 0 ? `+${change}` : change < 0 ? change : "—"}
              </td>
            </tr>
          );
        })}
        <tr style={{ fontWeight: 700 }}>
          <td>Total</td>
          <td className="num">
            {Object.values(result.constituencySeats).reduce((a, b) => a + (b ?? 0), 0)}
          </td>
          <td className="num">
            {Object.values(result.listSeats).reduce((a, b) => a + (b ?? 0), 0)}
          </td>
          <td className="num">
            {Object.values(result.totalSeats).reduce((a, b) => a + (b ?? 0), 0)}
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
  );
}

function SwingPanel({ swing, onSwingChange }: { swing: SwingConfig; onSwingChange: (s: SwingConfig) => void }) {
  const parties: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM"];

  const setNationalSwing = (party: PartyId, value: number) => {
    onSwingChange({
      ...swing,
      national: { ...swing.national, [party]: value },
    });
  };

  const resetAll = () => onSwingChange(createEmptySwing());

  return (
    <>
      <div className="swing-panel">
        {parties.map(p => {
          const value = swing.national[p] ?? 0;
          return (
            <div key={p} className="swing-slider">
              <label>
                <span style={{ color: PARTIES[p].colour }}>{PARTIES[p].shortName}</span>
                <span className="swing-value" style={{ color: value > 0 ? "var(--grn)" : value < 0 ? "var(--lab)" : "var(--text-muted)" }}>
                  {value > 0 ? "+" : ""}{value.toFixed(1)}%
                </span>
              </label>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                value={value}
                onChange={e => setNationalSwing(p, parseFloat(e.target.value))}
              />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, textAlign: "right" }}>
        <button className="btn" onClick={resetAll}>Reset All</button>
      </div>
    </>
  );
}

// --- Region Detail ---

const DISPLAY_PARTIES: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA", "OTH"];

function VoteBar({ votes }: { votes: PartyVotes }) {
  const total = Object.values(votes).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="vote-bar">
      {DISPLAY_PARTIES.map(p => {
        const v = votes[p] ?? 0;
        if (v === 0) return null;
        const pct = (v / total) * 100;
        return (
          <div
            key={p}
            className="vote-bar-segment"
            style={{ width: `${pct}%`, background: PARTIES[p].colour }}
            title={`${PARTIES[p].shortName}: ${v.toLocaleString()} (${pct.toFixed(1)}%)`}
          />
        );
      })}
    </div>
  );
}

function RegionDetail({
  regionName,
  result,
  baseResult,
  swungData,
  selectedConstituency,
  onSelectConstituency,
}: {
  regionName: string;
  result: ElectionResult;
  baseResult: ElectionResult;
  swungData: ElectionData;
  selectedConstituency: string | null;
  onSelectConstituency: (name: string | null) => void;
}) {
  const region = swungData.regions[regionName]!;
  const regionResult = result.regionResults[regionName]!;
  const baseRegionResult = baseResult.regionResults[regionName]!;

  if (selectedConstituency && swungData.constituencies[selectedConstituency]) {
    return (
      <ConstituencyDetail
        name={selectedConstituency}
        constituency={swungData.constituencies[selectedConstituency]!}
        baseConstituency={electionData.constituencies[selectedConstituency]!}
        winner={regionResult.constituencyWinners[selectedConstituency]!}
        onBack={() => onSelectConstituency(null)}
      />
    );
  }

  // Count seats in this region
  const constSeats: PartyVotes = {};
  const baseConstSeats: PartyVotes = {};
  for (const cName of region.constituencies) {
    const winner = regionResult.constituencyWinners[cName]!;
    constSeats[winner] = (constSeats[winner] ?? 0) + 1;
    const baseWinner = baseRegionResult.constituencyWinners[cName]!;
    baseConstSeats[baseWinner] = (baseConstSeats[baseWinner] ?? 0) + 1;
  }
  const listSeats = regionResult.dhondt.listSeats;
  const baseListSeats = baseRegionResult.dhondt.listSeats;

  const regionParties = DISPLAY_PARTIES.filter(p => {
    const c = constSeats[p] ?? 0;
    const l = listSeats[p] ?? 0;
    const bc = baseConstSeats[p] ?? 0;
    const bl = baseListSeats[p] ?? 0;
    return c + l + bc + bl > 0;
  });

  return (
    <>
      {/* Headline: seats won in this region */}
      <div className="card">
        <h2>{regionName}</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "12px 0" }}>
          {regionParties.map(p => {
            const c = constSeats[p] ?? 0;
            const l = listSeats[p] ?? 0;
            const total = c + l;
            const baseTotal = (baseConstSeats[p] ?? 0) + (baseListSeats[p] ?? 0);
            const change = total - baseTotal;
            return (
              <div key={p} style={{
                background: `${PARTIES[p].colour}18`,
                border: `2px solid ${PARTIES[p].colour}`,
                borderRadius: 8,
                padding: "8px 14px",
                textAlign: "center",
                minWidth: 80,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: PARTIES[p].colour }}>{total}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: PARTIES[p].colour }}>{PARTIES[p].shortName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {c} const + {l} list
                </div>
                {change !== 0 && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: change > 0 ? "var(--grn)" : "var(--lab)" }}>
                    {change > 0 ? `+${change}` : change}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {region.constituencies.length} constituencies + 7 list seats = {region.constituencies.length + 7} total seats in region
        </div>
      </div>

      {/* Regional list vote bar (compact) */}
      <div className="card">
        <h3>Regional List Vote</h3>
        <VoteBar votes={region.regionalListVotes} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: 4 }}>
          {DISPLAY_PARTIES.map(p => {
            const v = region.regionalListVotes[p] ?? 0;
            if (v === 0) return null;
            const total = Object.values(region.regionalListVotes).reduce((a, b) => a + (b ?? 0), 0);
            const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
            return (
              <span key={p} style={{ color: PARTIES[p].colour }}>
                {PARTIES[p].shortName}: {pct}%
              </span>
            );
          })}
        </div>
      </div>

      {/* D'Hondt - collapsible, shows result summary first */}
      <DHondtSection rounds={regionResult.dhondt.rounds} listSeats={listSeats} />

      {/* Constituencies */}
      <div className="card">
        <h3>Constituencies</h3>
        <table className="seat-table">
          <thead>
            <tr>
              <th>Constituency</th>
              <th>Winner</th>
              <th className="num">Majority</th>
              <th className="num">Base</th>
            </tr>
          </thead>
          <tbody>
            {region.constituencies.sort().map(name => {
              const c = swungData.constituencies[name]!;
              const winner = regionResult.constituencyWinners[name]!;
              const baseWinner = baseRegionResult.constituencyWinners[name]!;
              const votes = c.constituencyVotes;
              const sorted = DISPLAY_PARTIES
                .filter(p => (votes[p] ?? 0) > 0)
                .sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0));
              const majority = sorted.length >= 2
                ? (votes[sorted[0]!] ?? 0) - (votes[sorted[1]!] ?? 0)
                : votes[sorted[0]!] ?? 0;
              const changed = winner !== baseWinner;

              return (
                <tr
                  key={name}
                  style={{ cursor: "pointer", background: changed ? "var(--bg-tertiary)" : undefined }}
                  onClick={() => onSelectConstituency(name)}
                >
                  <td>{name}</td>
                  <td className="party-name" style={{ color: PARTIES[winner].colour }}>
                    {PARTIES[winner].shortName}
                    {changed && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (was {PARTIES[baseWinner].shortName})</span>}
                  </td>
                  <td className="num">{majority.toLocaleString()}</td>
                  <td className="num" style={{ color: PARTIES[baseWinner].colour }}>{PARTIES[baseWinner].shortName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DHondtSection({ rounds, listSeats }: { rounds: DHondtRound[]; listSeats: PartyVotes }) {
  const [expanded, setExpanded] = useState(false);

  // Summary: who won list seats
  const winners = DISPLAY_PARTIES
    .filter(p => (listSeats[p] ?? 0) > 0)
    .sort((a, b) => (listSeats[b] ?? 0) - (listSeats[a] ?? 0));

  const parties = DISPLAY_PARTIES.filter(p =>
    rounds.some(r => (r.quotients[p] ?? 0) > 0)
  );

  return (
    <div className="card">
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3>List Seats (D'Hondt)</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {expanded ? "Hide workings" : "Show workings"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "8px 0", flexWrap: "wrap" }}>
        {winners.map(p => (
          <span key={p} style={{
            color: PARTIES[p].colour,
            fontWeight: 700,
            fontSize: 15,
            background: `${PARTIES[p].colour}18`,
            padding: "2px 10px",
            borderRadius: 4,
          }}>
            {PARTIES[p].shortName} {listSeats[p]}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: expanded ? 12 : 0 }}>
        Allocation order: {rounds.map(r =>
          <span key={r.round} style={{ color: PARTIES[r.winner].colour }}>{PARTIES[r.winner].shortName}</span>
        ).reduce((acc: React.ReactNode[], el, i) => i === 0 ? [el] : [...acc, " → ", el], [])}
      </div>
      {expanded && (
        <table className="dhondt-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Round</th>
              {parties.map(p => (
                <th key={p} style={{ color: PARTIES[p].colour }}>{PARTIES[p].shortName}</th>
              ))}
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map(r => (
              <tr key={r.round}>
                <td style={{ textAlign: "left" }}>{r.round}</td>
                {parties.map(p => {
                  const q = r.quotients[p] ?? 0;
                  const isWinner = p === r.winner;
                  return (
                    <td key={p} className={isWinner ? "winner" : ""}>
                      {q > 0 ? Math.round(q).toLocaleString() : "—"}
                    </td>
                  );
                })}
                <td className="winner" style={{ color: PARTIES[r.winner].colour }}>
                  {PARTIES[r.winner].shortName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// --- Constituency Detail ---

function ConstituencyDetail({
  name,
  constituency,
  baseConstituency,
  winner,
  onBack,
}: {
  name: string;
  constituency: { constituencyVotes: PartyVotes; regionalVotes: PartyVotes };
  baseConstituency: { constituencyVotes: PartyVotes; regionalVotes: PartyVotes };
  winner: PartyId;
  onBack: () => void;
}) {
  const votes = constituency.constituencyVotes;
  const total = Object.values(votes).reduce((a, b) => a + (b ?? 0), 0);
  const sorted = DISPLAY_PARTIES
    .filter(p => (votes[p] ?? 0) > 0)
    .sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0));

  const majority = sorted.length >= 2
    ? (votes[sorted[0]!] ?? 0) - (votes[sorted[1]!] ?? 0)
    : 0;

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>{name}</h2>
          <button className="btn" onClick={onBack}>Back to Region</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: PARTIES[winner].colour, fontWeight: 700, fontSize: 16 }}>
            {PARTIES[winner].name}
          </span>
          <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
            majority: {majority.toLocaleString()}
          </span>
        </div>
        <VoteBar votes={votes} />
      </div>

      <div className="card">
        <h3>Constituency Vote</h3>
        <table className="seat-table">
          <thead>
            <tr>
              <th>Party</th>
              <th className="num">Votes</th>
              <th className="num">%</th>
              <th className="num">Base %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const v = votes[p] ?? 0;
              const pct = total > 0 ? (v / total) * 100 : 0;
              const baseTotal = Object.values(baseConstituency.constituencyVotes).reduce((a, b) => a + (b ?? 0), 0);
              const basePct = baseTotal > 0 ? ((baseConstituency.constituencyVotes[p] ?? 0) / baseTotal) * 100 : 0;

              return (
                <tr key={p}>
                  <td className="party-name" style={{ color: PARTIES[p].colour }}>
                    {PARTIES[p].name}
                  </td>
                  <td className="num">{v.toLocaleString()}</td>
                  <td className="num">{pct.toFixed(1)}%</td>
                  <td className="num" style={{ color: "var(--text-muted)" }}>{basePct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Regional List Vote</h3>
        <VoteBar votes={constituency.regionalVotes} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: 4 }}>
          {DISPLAY_PARTIES.map(p => {
            const v = constituency.regionalVotes[p] ?? 0;
            if (v === 0) return null;
            return (
              <span key={p} style={{ color: PARTIES[p].colour }}>
                {PARTIES[p].shortName}: {v.toLocaleString()}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

// --- Party Perspective ---

function PartySelector({ selected, onSelect }: { selected: PartyId | null; onSelect: (p: PartyId | null) => void }) {
  const parties: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM"];
  return (
    <div className="party-selector">
      {parties.map(p => (
        <span
          key={p}
          className={`party-chip ${selected === p ? "active" : ""}`}
          style={{ background: selected === p ? PARTIES[p].colour : `${PARTIES[p].colour}33`, color: selected === p ? "#000" : PARTIES[p].colour }}
          onClick={() => onSelect(selected === p ? null : p)}
        >
          {PARTIES[p].shortName}
        </span>
      ))}
    </div>
  );
}

function PartyPerspectivePanel({
  party,
  result,
  baseResult,
  data,
}: {
  party: PartyId;
  result: ElectionResult;
  baseResult: ElectionResult;
  data: ElectionData;
}) {
  const [showSeats, setShowSeats] = useState(false);
  const total = result.totalSeats[party] ?? 0;
  const baseTotal = baseResult.totalSeats[party] ?? 0;
  const change = total - baseTotal;
  const MAJORITY = 65;
  const distFromMajority = MAJORITY - total;

  // Build seat detail lists
  const constSeats: string[] = [];
  const listSeatsByRegion: Array<{ region: string; count: number }> = [];
  for (const [regionName, rr] of Object.entries(result.regionResults)) {
    for (const [constName, winner] of Object.entries(rr.constituencyWinners)) {
      if (winner === party) constSeats.push(constName);
    }
    const regionListCount = rr.dhondt.listSeats[party] ?? 0;
    if (regionListCount > 0) {
      listSeatsByRegion.push({ region: regionName, count: regionListCount });
    }
  }
  constSeats.sort();
  listSeatsByRegion.sort((a, b) => b.count - a.count);

  // Find seats gained and lost
  const gained: string[] = [];
  const lost: string[] = [];
  for (const [regionName, rr] of Object.entries(result.regionResults)) {
    const baseRR = baseResult.regionResults[regionName]!;
    for (const [constName, winner] of Object.entries(rr.constituencyWinners)) {
      const baseWinner = baseRR.constituencyWinners[constName]!;
      if (winner === party && baseWinner !== party) gained.push(constName);
      if (winner !== party && baseWinner === party) lost.push(constName);
    }
  }

  // Key targets: seats held by others where this party is closest
  const targets: Array<{ name: string; holder: PartyId; margin: number }> = [];
  const defences: Array<{ name: string; challenger: PartyId; margin: number }> = [];

  for (const [name, c] of Object.entries(data.constituencies)) {
    const votes = c.constituencyVotes;
    const sorted = DISPLAY_PARTIES
      .filter(p => (votes[p] ?? 0) > 0)
      .sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0));

    const winner = sorted[0]!;
    const partyVotes = votes[party] ?? 0;
    const winnerVotes = votes[winner] ?? 0;

    if (winner !== party && partyVotes > 0) {
      targets.push({ name, holder: winner, margin: winnerVotes - partyVotes });
    } else if (winner === party && sorted.length >= 2) {
      const secondVotes = votes[sorted[1]!] ?? 0;
      defences.push({ name, challenger: sorted[1]!, margin: partyVotes - secondVotes });
    }
  }

  targets.sort((a, b) => a.margin - b.margin);
  defences.sort((a, b) => a.margin - b.margin);

  return (
    <div className="card" style={{ borderLeft: `3px solid ${PARTIES[party].colour}` }}>
      <h2 style={{ color: PARTIES[party].colour }}>{PARTIES[party].name} Perspective</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
          <div
            style={{ fontSize: 13, color: "var(--text-secondary, #aab)", cursor: "pointer" }}
            onClick={() => setShowSeats(!showSeats)}
            title="Click to show seat details"
          >
            seats ({result.constituencySeats[party] ?? 0} const + {result.listSeats[party] ?? 0} list)
            <span style={{ fontSize: 11, marginLeft: 4, color: "var(--text-muted)" }}>{showSeats ? "▲" : "▼"}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: change > 0 ? "var(--grn)" : change < 0 ? "var(--lab)" : "var(--text-muted)" }}>
            {change > 0 ? `+${change}` : change}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #aab)" }}>change from base</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: distFromMajority <= 0 ? "var(--grn)" : "var(--text-primary)" }}>
            {distFromMajority <= 0 ? `Majority of ${-distFromMajority + 1}` : distFromMajority}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #aab)" }}>
            {distFromMajority > 0 ? "seats short of majority" : ""}
          </div>
        </div>
      </div>

      {showSeats && total > 0 && (
        <div style={{ marginBottom: 12, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
          {constSeats.length > 0 && (
            <div style={{ marginBottom: listSeatsByRegion.length > 0 ? 10 : 0 }}>
              <div style={{ fontSize: 11, color: PARTIES[party].colour, textTransform: "uppercase", marginBottom: 4 }}>
                Constituency Seats ({constSeats.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: constSeats.length > 8 ? "1fr 1fr" : "1fr", gap: "1px 12px", fontSize: 13 }}>
                {constSeats.map(name => <div key={name}>{name}</div>)}
              </div>
            </div>
          )}
          {listSeatsByRegion.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: PARTIES[party].colour, textTransform: "uppercase", marginBottom: 4 }}>
                List Seats ({result.listSeats[party] ?? 0})
              </div>
              <div style={{ fontSize: 13 }}>
                {listSeatsByRegion.map(({ region, count }) => (
                  <div key={region}>{count} in {region}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(gained.length > 0 || lost.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {gained.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--grn)", textTransform: "uppercase", marginBottom: 4 }}>Gains ({gained.length})</div>
              {gained.map(n => <div key={n} style={{ fontSize: 12 }}>{n}</div>)}
            </div>
          )}
          {lost.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--lab)", textTransform: "uppercase", marginBottom: 4 }}>Losses ({lost.length})</div>
              {lost.map(n => <div key={n} style={{ fontSize: 12 }}>{n}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Top 5 Targets</div>
          {targets.slice(0, 5).map(t => (
            <div key={t.name} style={{ marginBottom: 2 }}>
              <span style={{ color: PARTIES[t.holder].colour }}>{PARTIES[t.holder].shortName}</span>
              {" "}{t.name} <span style={{ color: "var(--text-muted)" }}>({t.margin.toLocaleString()})</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Top 5 Defences</div>
          {defences.slice(0, 5).map(d => (
            <div key={d.name} style={{ marginBottom: 2 }}>
              vs <span style={{ color: PARTIES[d.challenger].colour }}>{PARTIES[d.challenger].shortName}</span>
              {" "}{d.name} <span style={{ color: "var(--text-muted)" }}>({d.margin.toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Polling Presets ---

const POLLING_PRESETS: Record<string, { constituency: PartyVotes; regional: PartyVotes }> = {
  "Feb 2026 Average": {
    constituency: { SNP: 34.8, REFORM: 18.0, LAB: 17.2, CON: 10.3, LD: 9.7, GRN: 7.8 },
    regional: { SNP: 29.5, REFORM: 17.5, LAB: 16.3, CON: 11.3, GRN: 12.2, LD: 9.5, ALBA: 1.5 },
  },
};

// 2021 actual national vote shares (the baseline)
const BASE_CONST_PCT: PartyVotes = { SNP: 47.7, CON: 21.9, LAB: 21.6, GRN: 1.3, LD: 6.9 };
const BASE_REG_PCT: PartyVotes = { SNP: 40.3, CON: 23.5, LAB: 17.9, GRN: 8.1, LD: 5.1, ALBA: 1.7 };

const POLLING_PARTIES: PartyId[] = ["SNP", "CON", "LAB", "GRN", "LD", "REFORM", "ALBA"];

// The 2021 baseline as a single averaged figure per party (what the pre-filled values represent)
const BASELINE_PCT: PartyVotes = {};
for (const p of POLLING_PARTIES) {
  const avg = ((BASE_CONST_PCT[p] ?? 0) + (BASE_REG_PCT[p] ?? 0)) / 2;
  BASELINE_PCT[p] = Math.round(avg * 10) / 10;
}

function pollingToSwing(polls: PartyVotes): SwingConfig {
  const swing = createEmptySwing();
  for (const party of DISPLAY_PARTIES) {
    const constDiff = (polls[party] ?? 0) - (BASE_CONST_PCT[party] ?? 0);
    const regDiff = (polls[party] ?? 0) - (BASE_REG_PCT[party] ?? 0);
    const avg = (constDiff + regDiff) / 2;
    if (Math.abs(avg) > 0.1) {
      swing.national[party] = Math.round(avg * 2) / 2;
    }
  }
  return swing;
}

const MAX_TOTAL = 105;
const MIN_TOTAL = 90;

function PollingPresets({ onApply }: { onApply: (swing: SwingConfig) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [custom, setCustom] = useState<PartyVotes>(() => ({ ...BASELINE_PCT }));

  const applyPreset = (name: string) => {
    const preset = POLLING_PRESETS[name]!;
    const merged: PartyVotes = {};
    for (const p of POLLING_PARTIES) {
      const avg = ((preset.constituency[p] ?? 0) + (preset.regional[p] ?? 0)) / 2;
      merged[p] = Math.round(avg * 10) / 10;
    }
    onApply(pollingToSwing(merged));
    setOpen(false);
  };

  const applyCustom = () => {
    onApply(pollingToSwing(custom));
    setOpen(false);
  };

  const resetToBaseline = () => setCustom({ ...BASELINE_PCT });

  const total = POLLING_PARTIES.reduce((s, p) => s + (custom[p] ?? 0), 0);
  const canApply = total >= MIN_TOTAL && total <= MAX_TOTAL;

  const setPartyValue = (party: PartyId, raw: string) => {
    if (raw === "") {
      setCustom({ ...custom, [party]: 0 });
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setCustom({ ...custom, [party]: val });
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-primary" onClick={() => setOpen(!open)}>
        Polling
      </button>
      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "100%", marginTop: 4,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderRadius: 8, padding: 14, zIndex: 10, width: 340,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            <button
              className="btn"
              style={{ flex: 1, fontSize: 12, background: mode === "presets" ? "var(--accent)" : undefined }}
              onClick={() => setMode("presets")}
            >
              Saved polls
            </button>
            <button
              className="btn"
              style={{ flex: 1, fontSize: 12, background: mode === "custom" ? "var(--accent)" : undefined }}
              onClick={() => setMode("custom")}
            >
              Enter a poll
            </button>
          </div>

          {mode === "presets" && (
            <>
              {Object.keys(POLLING_PRESETS).map(name => (
                <div
                  key={name}
                  style={{ padding: "6px 10px", cursor: "pointer", borderRadius: 4, fontSize: 13 }}
                  onClick={() => applyPreset(name)}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {name}
                </div>
              ))}
            </>
          )}

          {mode === "custom" && (
            <>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                Enter vote share from a poll (%). The "2021" column shows the last election result for reference.
              </div>

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, padding: "0 2px" }}>
                <span style={{ width: 42, flexShrink: 0, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Party</span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", paddingRight: 10 }}>Poll %</span>
                <span style={{ width: 48, textAlign: "right", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>2021</span>
              </div>

              {POLLING_PARTIES.map(p => {
                const baseline = BASELINE_PCT[p] ?? 0;
                const current = custom[p] ?? 0;
                const diff = current - baseline;
                return (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{
                      color: PARTIES[p].colour, fontWeight: 700, fontSize: 13,
                      width: 42, flexShrink: 0,
                    }}>
                      {PARTIES[p].shortName}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={current || ""}
                      onChange={e => setPartyValue(p, e.target.value)}
                      onFocus={e => e.target.select()}
                      style={{
                        flex: 1, textAlign: "right", background: "var(--bg-tertiary)",
                        border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)",
                        padding: "6px 10px", fontSize: 14, fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <span style={{
                      width: 48, textAlign: "right", fontSize: 12, fontVariantNumeric: "tabular-nums",
                      color: Math.abs(diff) < 0.5 ? "var(--text-muted)" : diff > 0 ? "var(--grn)" : "var(--lab)",
                    }}>
                      {baseline.toFixed(1)}
                    </span>
                  </div>
                );
              })}

              {/* Total + validation */}
              <div style={{
                marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    color: canApply ? "var(--text-primary)" : "var(--lab)",
                  }}>
                    Total: {total.toFixed(1)}%
                  </span>
                  <button
                    className="btn"
                    onClick={resetToBaseline}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    Reset to 2021
                  </button>
                </div>

                {!canApply && total > 0 && (
                  <div style={{ fontSize: 11, color: "var(--lab)", marginBottom: 6 }}>
                    {total > MAX_TOTAL
                      ? `Vote shares add up to ${total.toFixed(1)}% - they need to be close to 100%.`
                      : `Vote shares only add up to ${total.toFixed(1)}% - they need to be close to 100%.`
                    }
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={applyCustom}
                  disabled={!canApply}
                  style={{
                    width: "100%", fontSize: 13, padding: "8px 18px",
                    opacity: canApply ? 1 : 0.4,
                    cursor: canApply ? "pointer" : "not-allowed",
                  }}
                >
                  Apply to calculator
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
