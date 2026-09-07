# 🏏 IPL Esports Simulator

## AI-Augmented Full-Stack Real-Time Multiplayer Auction Application

A full-stack, real-time multiplayer IPL auction simulator designed to reproduce the strategic, fast-paced environment of a professional cricket player auction. The application uses a decoupled frontend/backend architecture, with a browser-based auction interface communicating with a Flask backend and SQLite data layer.

The project was also developed as an **AI-augmented software engineering project**, using Gemini Pro/Flash to accelerate prototyping, debugging, architectural iteration, and implementation of the real-time multiplayer system.

> **Important:** AI augmentation refers to the development and engineering workflow. The core application itself is implemented using conventional HTML, CSS, JavaScript, Python, Flask, and SQLite components.

---

## 🚀 Core Capabilities

### 🎯 Real-Time Multiplayer Auction
- Host-controlled auction workflow with remote franchise participants.
- Live synchronization of the active player, valuation, bidding state, and countdown timer.
- Two-way state synchronization between Host and Guests.
- Multiplayer lobby with room creation, joining, and franchise claiming.

### 🛡️ Server-Side Bid Enforcement
- Server-side validation protects auction state from conflicting client updates.
- Player-name matching helps prevent stale or out-of-order requests from overwriting a newer bid.
- Designed to mitigate multi-user race conditions during simultaneous bidding.

### ⚡ Deterministic State Synchronization
- Centralized server state provides a common source of truth for connected clients.
- Host-controlled progression prevents client-side regression loops.
- Force-forward mechanisms allow the auction to advance reliably after a player is sold or marked unsold.

### 📊 Auction Management & Analytics
- Player pool and base-price management.
- Team purse and squad-state tracking.
- Auction progression controls, undo/reset protection, and player transitions.
- Post-auction statistics and analytics support.

### 🗄️ Resilient Data Layer
- SQLite-backed player, team, and auction data.
- Automated schema checks/patches help accommodate database structure changes without unnecessarily discarding existing data.

---

## 🤖 AI-Augmented Development

This project demonstrates the use of generative AI as a **software engineering accelerator**, rather than treating AI as a replacement for application architecture or implementation.

### AI-assisted workflow
- **Rapid prototyping:** Gemini Pro/Flash was directed to prototype application components and workflows.
- **Architecture iteration:** Used AI-assisted reasoning to explore and refine the decoupled frontend/backend design.
- **Debugging:** Investigated JavaScript, Flask, synchronization, concurrency, and database issues with AI assistance.
- **Concurrency & race-condition analysis:** Used AI-assisted analysis while designing the server-side Bid Enforcer and synchronization mechanisms.
- **Implementation acceleration:** Iteratively refined features through human-directed AI development and testing.

The final system remains a conventional full-stack web application with explicit application logic, server-side validation, persistent storage, and automated deployment.

---

## 🧩 System Architecture

```text
                         IPL ESPORTS SIMULATOR
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              FRONTEND                     BACKEND
              GitHub Pages                PythonAnywhere
                    │                           │
              index.html                    app.py
                    │                           │
          HTML / CSS / Vanilla JS             Flask
                    │                           │
                    └────────── API ────────────┘
                                │
                              SQLite
                                │
                       Auction / Player Data
```

The application follows a **decoupled deployment model**:

- **Frontend:** Static HTML/CSS/JavaScript delivered through GitHub Pages.
- **Backend:** Flask application hosted on PythonAnywhere.
- **Database:** SQLite used for persistent auction and application data.
- **Deployment:** GitHub Actions supports the frontend deployment workflow.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **AI-Augmented Development** | Gemini Pro / Gemini Flash |
| **Frontend** | HTML5, CSS3, Vanilla ES6+ JavaScript |
| **Backend** | Python 3.x, Flask |
| **Database** | SQLite3 |
| **API Communication** | HTTP / JSON |
| **Frontend Hosting** | GitHub Pages |
| **Backend Hosting** | PythonAnywhere |
| **CI/CD** | GitHub Actions |

---

## 📂 Project Structure

```text
ipl-auction-simulator/
│
├── data/                    # Seed/configuration data and player assets
├── app.py                   # Flask backend, API routes and server-side state logic
├── index.html               # Single-page frontend and auction interface
├── loaddata.py              # Database/data loading utility
├── ipl_auction.db           # SQLite application database
└── README.md                # Project documentation
```

---

## 🔄 Multiplayer Flow

```text
Host creates room
       │
       ▼
 Server creates multiplayer session
       │
       ▼
Guests join using room code
       │
       ▼
Guests claim available franchises
       │
       ▼
Host launches auction
       │
       ▼
 ┌──────────────────────────────┐
 │       Live Auction Loop      │
 │                              │
 │ Player → Bid → Validation    │
 │   → State Broadcast → Sync   │
 └──────────────────────────────┘
       │
       ▼
 Player Sold / Unsold
       │
       ▼
 Next Player / Auction Complete
```

---

## 🔐 Concurrency & Data Integrity

A key engineering challenge was maintaining consistent auction state when multiple clients interact with the same player simultaneously.

The system addresses this through:

1. **Server-side validation** rather than trusting client state.
2. **Bid enforcement** based on the current server-side player state.
3. **Centralized state broadcasting** between connected clients.
4. **Host-controlled auction progression** to prevent conflicting player transitions.
5. **Database-backed persistence** for core auction data.

This architecture was developed specifically to address race conditions, stale client state, and conflicting network updates encountered during multiplayer testing.

---

## 🌐 Deployment

### Frontend

The frontend is deployed through GitHub Pages:

**Live Application:**
https://sujitsaiy2007.github.io/ipl-auction-simulator/

### Backend

The Flask API is hosted separately on PythonAnywhere and is consumed by the frontend through HTTP API requests.

This separation allows the frontend to remain a static GitHub Pages deployment while retaining a live Python backend for multiplayer functionality.

---

## 📈 Development & DevOps

The project follows a lightweight continuous-delivery workflow:

```text
Development
    ↓
Git / GitHub
    ↓
GitHub Actions
    ↓
GitHub Pages
    ↓
Live Frontend

Flask Application
    ↓
PythonAnywhere
    ↓
Live API Backend
```

GitHub acts as the source-of-truth repository for the application code, documentation, database assets, and deployment workflow.

---

## 🎓 Project Purpose

This project was developed as a practical full-stack engineering exercise and as a practice of using AI in development 

It combines:

- AI-assisted software development
- Full-stack web application design
- Real-time multiplayer synchronization
- REST-style API development
- Database-backed application state
- Concurrency and race-condition handling
- Cloud deployment
- CI/CD practices

The result is an end-to-end application that demonstrates how AI-assisted development can be combined with conventional software engineering principles to rapidly prototype, debug, and evolve a non-trivial full-stack system.

---

## 🔗 Project Links

- **GitHub Repository:** https://github.com/SujitSaiY2007/ipl-auction-simulator
- **Live Application:** https://sujitsaiy2007.github.io/ipl-auction-simulator/

---

## 👤 Project Author

**Sujit Sai Y**

AI-Augmented Full-Stack Application Development | Python | Flask | JavaScript | SQLite | GitHub Actions
