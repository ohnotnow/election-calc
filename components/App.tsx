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
          <h1>Scottish Parliament Election Calculator</h1>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Based on notional 2021 results on 2026 boundaries
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

  return (
    <>
      <div className="card">
        <h2>{regionName}</h2>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Regional List Votes</div>
          <VoteBar votes={region.regionalListVotes} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: 4 }}>
            {DISPLAY_PARTIES.map(p => {
              const v = region.regionalListVotes[p] ?? 0;
              if (v === 0) return null;
              return (
                <span key={p} style={{ color: PARTIES[p].colour }}>
                  {PARTIES[p].shortName}: {v.toLocaleString()}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>D'Hondt Allocation</h3>
        <DHondtWalkthrough rounds={regionResult.dhondt.rounds} />
      </div>

      <div className="card">
        <h3>Constituencies</h3>
        <table className="seat-table">
          <thead>
            <tr>
              <th>Constituency</th>
              <th>Winner</th>
              <th className="num">Majority</th>
            </tr>
          </thead>
          <tbody>
            {region.constituencies.sort().map(name => {
              const c = swungData.constituencies[name]!;
              const winner = regionResult.constituencyWinners[name]!;
              const votes = c.constituencyVotes;
              const sorted = DISPLAY_PARTIES
                .filter(p => (votes[p] ?? 0) > 0)
                .sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0));
              const majority = sorted.length >= 2
                ? (votes[sorted[0]!] ?? 0) - (votes[sorted[1]!] ?? 0)
                : votes[sorted[0]!] ?? 0;

              return (
                <tr
                  key={name}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectConstituency(name)}
                >
                  <td>{name}</td>
                  <td className="party-name" style={{ color: PARTIES[winner].colour }}>
                    {PARTIES[winner].shortName}
                  </td>
                  <td className="num">{majority.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DHondtWalkthrough({ rounds }: { rounds: DHondtRound[] }) {
  const parties = DISPLAY_PARTIES.filter(p =>
    rounds.some(r => (r.quotients[p] ?? 0) > 0)
  );

  return (
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
  const total = result.totalSeats[party] ?? 0;
  const baseTotal = baseResult.totalSeats[party] ?? 0;
  const change = total - baseTotal;
  const MAJORITY = 65;
  const distFromMajority = MAJORITY - total;

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
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            seats ({result.constituencySeats[party] ?? 0} const + {result.listSeats[party] ?? 0} list)
          </div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: change > 0 ? "var(--grn)" : change < 0 ? "var(--lab)" : "var(--text-muted)" }}>
            {change > 0 ? `+${change}` : change}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>change from base</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: distFromMajority <= 0 ? "var(--grn)" : "var(--text-primary)" }}>
            {distFromMajority <= 0 ? `Majority of ${-distFromMajority + 1}` : distFromMajority}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {distFromMajority > 0 ? "seats short of majority" : ""}
          </div>
        </div>
      </div>

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

function PollingPresets({ onApply }: { onApply: (swing: SwingConfig) => void }) {
  const [open, setOpen] = useState(false);

  const applyPreset = (name: string) => {
    const preset = POLLING_PRESETS[name]!;
    const swing = createEmptySwing();

    // Calculate swing as difference from 2021 base percentages
    for (const party of DISPLAY_PARTIES) {
      const constDiff = (preset.constituency[party] ?? 0) - (BASE_CONST_PCT[party] ?? 0);
      const regDiff = (preset.regional[party] ?? 0) - (BASE_REG_PCT[party] ?? 0);
      // Use the average of constituency and regional swing
      const avg = (constDiff + regDiff) / 2;
      if (Math.abs(avg) > 0.1) {
        swing.national[party] = Math.round(avg * 2) / 2; // round to 0.5
      }
    }

    onApply(swing);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-primary" onClick={() => setOpen(!open)}>
        Load Polling
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", marginTop: 4,
          background: "var(--bg-tertiary)", border: "1px solid var(--border)",
          borderRadius: 6, padding: 8, zIndex: 10, minWidth: 200,
        }}>
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
        </div>
      )}
    </div>
  );
}
