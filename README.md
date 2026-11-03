# 🏏 IPL Esports Simulator (Full-Stack React + Node.js + Gemini AI)

## Advanced EV Metrics, Gemini Tactical War Room & Tournament Engine

A production-grade IPL mega auction esports simulator featuring deep statistical modeling, live algorithmic valuations, real-time multiplayer room synchronization, and Google Gemini AI tactical intelligence.

---

## 🚀 What's New & Core Capabilities

### 1. 🎨 Complete UI/UX Overhaul
- **Modern Stadium & Esports Theme**: Glassmorphic dark cards, floodlight glow headers, franchise color indicators (CSK Yellow, MI Blue, RCB Red, KKR Purple, SRH Orange, RR Pink, DC Blue/Red, GT Navy/Gold, LSG Cyan/Navy, PBKS Red).
- **Interactive Player Inventory**: Instant search bar with quick role filters (`All`, `Batters`, `Bowlers`, `All-Rounders`, `Keepers`, `Overseas`) and tier badges.
- **Dynamic Bidding Arena**:
  - Animated countdown bar with heartbeat pulse in final 10 seconds.
  - Large green bid counter with formatted Crores.
  - Franchise buttons with team primary colors and live active bidder highlight.
  - Role-based franchise access control (Guests can only bid for their claimed team; Commissioner has override).
  - Safety checks preventing illegal bids or violating minimum squad reserve funds.
  - 🔨 SOLD, ❌ UNSOLD, ⏭️ Next, and ↩️ Undo controls.
  - ⚡ 2x Sudden Death matrix automatically triggered when a team completes its minimum squad while other franchises trail behind.

### 2. 📊 Solidified IPL 2026 Player Database & Deep Telemetry
- **Expanded Player Attributes**:
  - `ipl_team_2026`: 2026 IPL franchise tags (e.g., RCB, MI, CSK, KKR, SRH, RR, DC, GT, LSG, PBKS).
  - `tier`: `Marquee`, `Elite`, `Capped`, and `Uncapped`.
  - `specialization`: Granular tactical roles (e.g. *World Premier Death Specialist & Yorker King*, *Spin Destroyer*, *Thunderbolt 156.7 kmph Pace Sensation*).
  - `batting_style` and `bowling_style`.
  - `matches`, `batting_runs`, `batting_avg`, `batting_strike_rate`, `fifties`, `hundreds`, `highest_score`.
  - `bowling_wickets`, `bowling_avg`, `bowling_strike_rate`, `bowling_economy`, `four_w`, `five_w`, `best_bowling`.
  - Detailed Scouting Trait report.

### 3. 🧠 Deep Gemini AI Integration (`gemini-3.8-flash`)
- **Live AI War-Room Advisor (`/api/ai/live-advice`)**: Evaluates the active bid in real time with strategic recommendation (`STRONG_BID`, `CAUTIOUS_BID`, `PASS_RECOMMENDED`), ceiling price recommendation, pitch synergy, and squad fit.
- **AI Franchise Squad Audit (`/api/ai/squad-audit`)**: Analyzes each franchise's roster depth, awarding a Tactical Composition Rating (/100), primary strength, structural vulnerability, and impact player suggestion.
- **AI Season Forecast & Awards Simulation (`/api/ai/season-forecast`)**: Generates an exciting post-auction commentary report with headline, Orange Cap candidate, Purple Cap candidate, Dark Horse team, and championship narrative.
- **Full Fallback Protection**: If the Gemini API is processing or an API key is not configured, a built-in algorithmic engine handles all valuations and tactical insights seamlessly without interruption.

### 4. 👥 Game Mode Selection & Multi-Tab Synchronization
- **Solo Sandbox**: Isolated draft state with local persistence.
- **Multiplayer Shared Rooms**: Instant 4-letter room code generator. Guests can join, view claimed teams in the waiting room, and await commissioner launch. State synchronizes across tabs via the `BroadcastChannel` API.

### 5. 📋 Playing XI Builder & Tournament Analytics
- Sequential selection of 11-player squads enforcing the maximum 4 overseas player limit.
- Tournament Balance Index (TBI) composite score across top 5 core batting averages, 5-man bowling attack, bench depth, and structural penalties.
- Star ratings, team highlights/drawbacks, champion crown (👑), and celebratory confetti animation.
- Permanent Hall of Fame and Operations Ledger.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 (Vite SPA) |
| **Language** | TypeScript 5.7 |
| **Backend Server** | Node.js 22 + Express 5 (Full-Stack server with Vite middleware) |
| **AI Integration** | Google Gen AI SDK (`@google/genai`) using `gemini-3.8-flash` |
| **Styling** | Custom CSS3 with Inter & Poppins typography, glassmorphism, and sports stadium palette |
| **State & Sync** | React Context + LocalStorage + BroadcastChannel |
| **Celebrations** | Canvas Confetti |

---

## 🏃 Running the Application

```bash
# Install dependencies
npm install

# Start fullstack server on port 3000
npm run dev

# Build production bundle
npm run build
```
