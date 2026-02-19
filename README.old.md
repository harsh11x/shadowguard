# SHADOWGUARD

**Deterministic Pre-Execution Blockchain Security Proxy**

SHADOWGUARD simulates Ethereum transactions *before* they hit the chain — scanning bytecode, computing state diffs, and scoring risk in real-time. No gas spent. No transactions broadcast.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Ethereum Sepolia Testnet (Chain ID: 11155111) |
| **Simulation Engine** | Python 3 — `web3.py`, `eth_call`, `eth_estimateGas` |
| **API Bridge** | Node.js + Express.js — spawns Python subprocess, streams JSON via SSE |
| **Frontend** | React 18 + Vite — brutalist UI, real-time SSE step streaming |
| **Database** | SQLite (via Python) — stores all simulation records |
| **Dev Runner** | `concurrently` — single `npm run dev` starts everything |

---

## Architecture

```
npm run dev
├── backend/  (Express.js, port 3001)
│   ├── POST /api/simulate  →  SSE stream of 8 simulation steps
│   ├── GET  /api/history   →  past simulations from SQLite
│   ├── GET/POST /api/policy →  read/write security policy
│   └── GET  /api/network   →  live Sepolia chain data
│       └── lib/python.js   →  spawns python3 main.py --json ...
└── frontend/ (React + Vite, port 5173)
    ├── /           Simulate page — form + live step stream
    ├── /history    History page — past simulation table
    └── /policy     Policy page — risk threshold editor
```

**Python Bridge**: Node.js spawns `python3 main.py --json simulate --from ... --to ...` and reads newline-delimited JSON from stdout. Each simulation step emits one JSON line, streamed to the browser via Server-Sent Events.

---

## Simulation Pipeline (8 Steps)

| Step | What Happens | Data Source |
|---|---|---|
| 1 | Transaction Interception & Validation | Input validation, gas estimation via `eth_estimateGas` |
| 2 | Pre-Execution State Snapshot | Live `eth_getBalance`, `eth_getCode`, `eth_getStorageAt` |
| 3 | Shadow Execution | `eth_call` — simulates execution, no gas spent |
| 4 | State Diff Computation | Real gas price × gas used = actual cost |
| 5 | Opcode Analysis | Bytecode scan for SELFDESTRUCT, DELEGATECALL, CREATE2, SSTORE |
| 6 | Behavioral Analysis | Real opcode counts + `eth_getLogs` event activity |
| 7 | Risk Score Computation | Weighted rule engine (0–100) |
| 8 | Security Policy Application | User-configurable thresholds from `policy.json` |

---

## 🐳 Docker Deployment

The entire project is containerized using Docker and Docker Compose. This includes the Python simulation engine, the Express backend, and the React frontend.

### Prerequisites
- Docker
- Docker Compose

### Fast Start
1. **Clone the repository** (if not already done).
2. **Run the production stack**:
   ```bash
   docker-compose up --build
   ```
3. **Access the application**:
   - Frontend: `http://localhost`
   - API Backend: `http://localhost:3001`

### Service Breakdown
- **Backend (Node + Python)**: Runs on port `3001`. It contains the Express API and the Python simulation core.
- **Frontend (Nginx + React)**: Runs on port `80`. It serves the production build of the React app and proxies `/api` calls to the backend.
- **Data Persistence**: A local `./data` directory is mapped to the containers to persist the SQLite database and policies.

### Environment Variables
You can customize the deployment using environment variables in a `.env` file at the root:
- `ETH_RPC_URL`: Primary Ethereum RPC endpoint.
- `API_PORT`: Port for the backend API.

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- `pip install -r requirements.txt`

### Run

```bash
# 1. Install Python deps
pip install -r requirements.txt

# 2. Install Node deps
cd web && npm install
cd backend && npm install
cd ../frontend && npm install
cd ../..

# 3. Start everything
cd web && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health

### CLI (still works)

```bash
# Standard rich terminal output
python3 main.py simulate --from 0x000...001 --to 0x7b79...E7f9 --value 0 --data 0x

# JSON output (used by Node.js bridge)
python3 main.py --json simulate --from 0x000...001 --to 0x7b79...E7f9 --value 0 --data 0x

# High-drain test (triggers HIGH risk + policy violation)
python3 main.py simulate --from 0x000...001 --to 0x7b79...E7f9 --value 1.5 --data 0x

# Set policy
python3 main.py set_policy --max_drain 20 --disallow_selfdestruct true
```

---

## Security Policy

Configurable via the web UI (`/policy`) or CLI:

| Policy | Default | Effect |
|---|---|---|
| `max_drain` | 50% | Block if sender balance drain exceeds this |
| `disallow_selfdestruct` | false | Block contracts with SELFDESTRUCT opcode |
| `disallow_delegatecall` | false | Block contracts with DELEGATECALL opcode |
| `max_nested_calls` | 5 | Flag deep call chains (reentrancy risk) |

---

## Risk Scoring

| Score | Level | Meaning |
|---|---|---|
| 0–25 | ✅ LOW | Safe to proceed |
| 26–50 | 🟡 MEDIUM | Review triggered rules |
| 51–75 | 🔶 HIGH | Manual audit recommended |
| 76–100 | 🔴 CRITICAL | Block immediately |

---

## Project Structure

```
shadowguard/
├── main.py              # CLI entry point + --json bridge mode
├── config.py            # Network config, risk weights
├── requirements.txt     # Python deps
├── policy.json          # Active security policy
├── shadowguard.db       # SQLite simulation history
├── core/
│   ├── interceptor.py   # Transaction validation
│   ├── shadow_executor.py  # eth_call simulation
│   ├── state_snapshot.py   # On-chain state reader
│   ├── state_diff.py    # Pre/post state comparison
│   ├── opcode_analyzer.py  # Bytecode scanner
│   ├── behavior_analyzer.py # Gas + call pattern analysis
│   ├── risk_engine.py   # Weighted risk scoring
│   └── policy_engine.py # Policy enforcement
├── rpc/
│   └── provider.py      # Web3 RPC with fallbacks
├── models/
│   └── simulation.py    # Data models
├── storage/
│   ├── database.py      # SQLite persistence
│   └── logger.py        # Logging setup
├── utils/
│   └── helpers.py       # Shared utilities
└── web/
    ├── package.json     # Root: concurrently runner
    ├── backend/
    │   ├── server.js    # Express API server
    │   ├── lib/python.js  # Python subprocess bridge
    │   └── routes/
    │       ├── simulate.js  # SSE simulation stream
    │       ├── history.js   # Simulation log
    │       ├── policy.js    # Policy CRUD
    │       └── network.js   # Live chain status
    └── frontend/
        ├── src/
        │   ├── App.jsx      # Router + layout
        │   ├── index.css    # Brutalist design system
        │   └── pages/
        │       ├── Simulate.jsx  # Main simulation UI
        │       ├── History.jsx   # Past simulations
        │       └── Policy.jsx    # Policy editor
        └── vite.config.js
```

---

## Design Philosophy

**Brutalist UI**: Raw monospace fonts (JetBrains Mono), hard 2px borders, no rounded corners, black/white/yellow high-contrast palette. The interface reflects the nature of the tool — direct, uncompromising, technical.

**Real data only**: Every value shown is fetched live from the Ethereum Sepolia network. No mocked data, no hardcoded results. Simulation IDs are unique per run (timestamp + random entropy). Risk scores change with inputs and policy.

**Python bridge pattern**: Rather than rewriting the simulation engine in JavaScript, Node.js spawns Python as a subprocess and reads newline-delimited JSON. This keeps the battle-tested Python engine intact while enabling a modern web frontend.
