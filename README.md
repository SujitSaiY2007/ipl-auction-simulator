# 🏏 IPL Esports Simulator: Real-Time Multiplayer Auction

A high-performance, full-stack, real-time multiplayer web application designed to simulate the strategic, fast-paced environment of an Indian Premier League player auction. Built with a decoupled architectural pattern, the system supports a seamless synchronization layer between a live Host (the Auction Commissioner) and multiple remote Guests (Franchise Owners).

---

## 🚀 Core Features

* **Real-Time Two-Way Sync:** A highly responsive state-broadcasting engine that synchronizes active player cards, live valuations, and countdown timers across different client devices at a $1000\text{ ms}$ polling frequency.
* **The Backend "Bid Enforcer":** A specialized data-integrity controller that stops race conditions by checking player names on the server. It prevents out-of-order data or late host network packets from wiping out a guest's higher bid.
* **Dynamic Multiplayer Lobby:** Live guest tracking where franchise claims instantly show up on the host's dashboard with green confirmation badges.
* **Deterministic Force-Forward Override:** Integrated state-flushing architecture that stops client-side regression loops, allowing the host to advance the draft board seamlessly.
* **Automated Schema Patches:** A self-healing SQLite database manager that automatically inspects, modifies, and patches missing columns on startup without losing existing data.

---

## 🛠️ Technology Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 Custom Properties, Vanilla ES6+ JavaScript |
| **Backend** | Python 3.x, Flask Micro-framework |
| **Database** | SQLite3 (With Row-factory object mappings) |
| **CI/CD / Hosting**| GitHub Actions (Automated Pages compilation), PythonAnywhere WSGI Server |

---

## 📂 Project Architecture

```text
├── data/                    # Seed configurations containing player pools & base prices
├── app.py                   # Master Flask application containing API routes & state machinery
├── index.html               # Single-Page Application (SPA) frontend & synchronization dashboard
├── loaddata.py              # Automates raw asset mapping into SQL rows
└── ipl_auction.db           # SQLite transactional data storage instance
