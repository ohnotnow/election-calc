# election-calc

Interactive Scottish Parliament election calculator. Apply hypothetical swings to the 2021 baseline results (mapped onto 2026 constituency boundaries) and see how seats shift.

## What it does

The Scottish Parliament uses the Additional Member System: 73 constituencies elected by first-past-the-post, plus 56 regional list seats allocated across 8 regions using the D'Hondt method. This calculator models both layers.

The baseline data comes from Ballot Box Scotland's notional 2021 results on the new 2026 boundaries. All 73 constituencies and 8 regions are included with full vote totals for both the constituency and regional ballots.

Sliders let you apply percentage-point swings at national, regional, or individual constituency level. The parliament hemicycle, seat summary table, and regional breakdowns all recalculate as you drag. There's also a party perspective mode where you pick a party and see their targets, vulnerable holds, and distance from a majority. Polling presets load recent averages so you can see what they'd mean in seats.

## Getting started

You need [Bun](https://bun.sh) installed.

```bash
git clone git@github.com:ohnotnow/election-calc.git
cd election-calc
bun install
```

For local development with hot reloading:

```bash
bun run dev
```

Then open http://localhost:3000 in your browser.

## Building for deployment

The app is entirely client-side. To produce a static build:

```bash
bun run build
```

This outputs `dist/index.html`, a JS bundle, and a CSS file. Deploy the `dist/` folder to any static host (Netlify, GitHub Pages, etc).

## Running tests

Tests verify the D'Hondt engine reproduces the correct notional seat allocations (SNP 63, Con 31, Lab 21, Grn 10, LD 4).

```bash
bun test
```

## Project structure

```
engine/
  types.ts        - TypeScript types and party colour definitions
  dhondt.ts       - D'Hondt seat allocation with round-by-round walkthrough
  swing.ts        - Swing calculation at national/regional/constituency level
data/
  election2021.ts - Notional 2021 results on 2026 boundaries (73 constituencies, 8 regions)
components/
  App.tsx          - Main React app with all UI components
  ParliamentChart.tsx - SVG hemicycle showing 129 seats
index.ts          - Bun.serve() entry point
index.html        - HTML shell
frontend.tsx      - React mount point
index.css         - Dark dashboard styles
```

## Data sources

Constituency and regional vote data from [Ballot Box Scotland](https://ballotbox.scot/scottish-parliament/sp-21-new-boundaries-notionals/)'s notional 2021 results on 2026 boundaries. Polling presets from their polling tracker.
