# 🛡️ SHADOWGUARD: Pre-Execution Security Proxy

### "The Firewall for your Blockchain Transactions"

**ShadowGuard** is a Pre-Execution Security Proxy that checks blockchain transactions **before** they are finalized. It acts as a safety layer (a "firewall") between your wallet and the decentralized web, preventing loss before it can happen.

---

## 🧐 What does ShadowGuard do? (Simple Words)

In the crypto world, once you sign a transaction, it's usually gone forever. If you accidentally interact with a malicious contract or a wallet drainer, your funds can disappear in seconds.

**ShadowGuard changes this:**
It intercepts your transaction, simulates it in a **safe shadow environment**, and analyzes exactly what will happen to your assets. It assigns a risk score and then decides whether to **Allow** or **Block** it. 

By running transactions through this "pre-check," ShadowGuard helps reduce:
*   ❌ **Fraud & Scams**: Detecting hidden "drain" commands.
*   ❌ **Smart Contract Exploits**: Spotting known attack patterns.
*   ❌ **Accidental Losses**: Warning you if you're about to send funds to the wrong place.

---

## 📽️ Project Presentation
A detailed PowerPoint presentation (`.pptx`) explaining the architecture and vision of this project can be found in the **`Presentation/`** folder.

---

## 🚀 Key Features

### 1. 🔍 Predictive Simulation (AssetFlow & CodeDNA)
Don't just look at hex data. ShadowGuard visualizes the transaction flow. You can see exactly which tokens are moving, who is receiving them, and if the contract code looks suspicious.

### 2. 🌊 Live Mempool Stream (With "Smart Scroll")
Watch the entire Ethereum network in real-time. 
*   **Infinite Feed**: See every transaction as it happens.
*   **Sticky Scroll**: Scroll down to pause the feed and inspect rows. Scroll to the top to resume auto-updates.

### 3. 🛡️ Admin Approval System
Every new developer account requires manual verification. This ensures only trusted entities are using the security proxy at scale.

### 4. 🔑 Developer API Portal
Generate API keys, track your usage, and integrate ShadowGuard's security into your own apps.

---

## ⚡️ Quick Start Guide

### 1. Requirements
*   **Docker Desktop** (Make sure it is running).

### 2. Build & Launch
Open your terminal in the project folder and run:
```bash
docker-compose up --build
```
*Wait until you see `Server running on port 3001`.*

---

## 🏃‍♂️ Step-by-Step Walkthrough

Follow these steps to experience the full power of ShadowGuard:

### Step 1: Monitor the Network
Visit [http://localhost:8000/live](http://localhost:8000/live). You will see real-time transactions from the Ethereum network flowing in. Scroll down to "pause" the list and inspect a specific transaction.

### Step 2: Create a Developer Account
1.  Go to the **Sign Up** section on the main page.
2.  Register with a new email.
3.  **Note**: Your account will be "Pending" and you won't be able to log in yet.

### Step 3: Admin Approval
1.  Open [http://localhost:8000/admin/login](http://localhost:8000/admin/login).
2.  Login with: `admin@shadowguard.com` / `admin123`.
3.  Go to the **Verification Queue** tab.
4.  Find your new account and click **Approve**.

### Step 4: Generate API Keys
1.  Now go to [http://localhost:8000/developer](http://localhost:8000/developer) and log in with the account you just created.
2.  Click **"Generate New API Key"**.
3.  Copy your key—you can now use this to call the ShadowGuard API!

### Step 5: Run a Simulation
1.  Go to the **Simulate** page.
2.  Enter a transaction (or use the pre-filled demo data).
3.  Click **Simulate** and watch the **Visual Attack Graph** reveal the transaction's true intent.

---

## 🔑 Portals & Access

| Portal | URL | Usage |
| :--- | :--- | :--- |
| **Main Dashboard** | [http://localhost:8000](http://localhost:8000) | Main interface for simulations and live feed. |
| **Developer Portal** | [http://localhost:8000/developer](http://localhost:8000/developer) | Manage your API keys and see your usage stats. |
| **Admin Panel** | [http://localhost:8000/admin/login](http://localhost:8000/admin/login) | Approve users and manage the system. |

### 🔐 Login Credentials (Pre-Seeded)

| Account Type | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@shadowguard.com` | `admin123` |
| **Demo Developer** | `harshdevsingh2004@gmail.com` | `12345678` |

---

## 🏗️ How it Works

1.  **Intercept**: The proxy catches a transaction request.
2.  **Shadow Simulation**: Using a local fork of the blockchain (via Anvil/Foundry), it executes the transaction in a private "sandbox."
3.  **Analysis**: It checks for balance changes, contract permissions, and known threat signatures.
4.  **Verdict**: It returns a risk score (0-100). If the risk is too high, the transaction is blocked.

---

## 🧼 Cleanup & Maintenance

*   **To stop the system**: Press `Ctrl+C` in your terminal.
*   **To wipe data & reset**: `docker-compose down -v`.
*   **To update specific parts**: `docker-compose up -d --build frontend` (or `backend`).

---
*Created for the next generation of Web3 Security.*
