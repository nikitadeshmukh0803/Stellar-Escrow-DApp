# TrustVault — Stellar Escrow DApp

A decentralized escrow application built on the Stellar blockchain using Soroban (Stellar's smart contract platform). It lets two parties lock funds in a contract and release them progressively as work milestones are completed — trustlessly, without any intermediary.


---

## Live Project Link

**https://trust-vault-escrowdapp.netlify.app/**

> Connect a Freighter wallet funded on Stellar Testnet to interact with the live contract.

---

## 📹 Demo Video

**https://youtu.be/ZCLNBSqFzOo?si=mlNwLSc5wic6m91M**

Covers: wallet connection → joining the bank → listing a service → booking → confirming completion.

---



## 🖼️ Screenshots

### Test output — 11 tests passing
<img width="1158" height="203" alt="7" src="https://github.com/user-attachments/assets/56730c83-b1f8-4794-9af6-f57e1503498a" />


### Contract Deployment
<img width="1452" height="347" alt="1" src="https://github.com/user-attachments/assets/2ddb5bec-b8ff-4f03-9bdf-c1b09f173179" />


### Working of Community Time Bank D-App
<img width="1918" height="1011" alt="2" src="https://github.com/user-attachments/assets/5a688361-429f-4d3e-9e70-f8e84846e8a9" />
<img width="1918" height="1015" alt="3" src="https://github.com/user-attachments/assets/9df26cfa-a89b-485e-afac-c8b27c4b5497" />
<img width="1917" height="1012" alt="4" src="https://github.com/user-attachments/assets/7e59d2e0-9e1e-40a2-bbd7-94b2cfc19820" />



### Contract Invoke
<img width="1918" height="957" alt="5" src="https://github.com/user-attachments/assets/45d34d1b-9af4-4493-8724-b376c5d259da" />
<img width="1918" height="890" alt="6" src="https://github.com/user-attachments/assets/136f907c-1e1c-476c-a600-f434fc7bda4d" />






---

## 🏗️ Architecture

```
orange-belt/
└── escrow-dapp/
    ├── public/                        # Static assets
    ├── src/
    │   ├── assets/                    # Images, icons
    │   ├── components/
    │   │   ├── BalanceBadge.jsx       # Displays user TIME token balance
    │   │   ├── OfferForm.jsx          # Form to list a new service
    │   │   ├── ServiceBoard.jsx       # Active service listings grid
    │   │   └── WalletConnect.jsx      # Freighter wallet connect UI
    │   ├── context/
    │   │   └── WalletContext.jsx      # Global wallet state via React Context
    │   ├── hooks/
    │   │   └── useWallet.js           # Freighter wallet hook
    │   ├── tests/
    │   │   ├── balance.test.js        # 3 token balance tests
    │   │   ├── cache.test.js          # 5 cache utility tests
    │   │   ├── setup.js               # Vitest setup (jsdom + localStorage reset)
    │   │   └── wallet.test.js         # 3 wallet connection tests
    │   ├── utils/
    │   │   ├── cache.js               # localStorage cache with TTL + SWR helper
    │   │   └── contract.js            # Stellar SDK contract client
    │   ├── App.css
    │   ├── App.jsx                    # Root component & routing
    │   ├── index.css
    │   └── main.jsx                   # React entry point
    ├── screenshots/                   # Test output & UI screenshots for README
    ├── contract/            # Soroban smart contract (Rust)
    ├── .env                           # VITE_CONTRACT_ID (not committed)
    ├── .gitignore
    ├── contract-redeploy-steps.txt    # Steps to redeploy contract to Testnet
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    └── vite.config.js
```

### Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Rust · Soroban SDK 21 |
| Blockchain | Stellar Testnet |
| Frontend | React 18 · Vite · Tailwind CSS |
| Wallet | Freighter (browser extension) |
| Testing | Vitest |
| Deployment | Vercel |

---

## ⚙️ Local Setup

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli) (`cargo install stellar-cli`)
- [Node.js](https://nodejs.org/) v18+
- [Freighter wallet](https://freighter.app/) browser extension

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/Stellar-Escrow-DApp.git
cd stellar-escrow-dapp
```

---

### 2. Build & deploy the contract

```bash
cd contract

# Add the WASM compilation target (first time only)
rustup target add wasm32-unknown-unknown

# Build
stellar contract build

# Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet

# Copy the printed contract ID — you'll need it in step 4
```

---

### 3. Run contract tests

```bash
cd contract
cargo test
```

Expected output:

```
running 6 tests
test tests::test_join_gives_initial_balance      ... ok
test tests::test_cannot_join_twice               ... ok
test tests::test_list_service_increments_id      ... ok
test tests::test_book_and_confirm_transfers_tokens ... ok
test tests::test_cannot_book_without_enough_tokens ... ok
test tests::test_cannot_book_own_service         ... ok

test result: ok. 6 passed; 0 failed
```

---

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_CONTRACT_ID=CBGYAQQGPXK4UJQOEMJEJMGU7NGVXH6TK3IQ4WA47GBJ7EROGGXM3YY3
```

---

### 5. Install dependencies & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### 6. Run frontend tests

```bash
npm test
```

Expected output:

```
 RUN  v4.1.4 D:/Sanket/Stellar/orange-belt/community-timebank

 ✓ src/tests/wallet.test.js  (3 tests) 4ms
 ✓ src/tests/balance.test.js (3 tests) 4ms
 ✓ src/tests/cache.test.js   (5 tests) 108ms

 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  05:47:57
   Duration  2.33s (transform 119ms, setup 537ms, import 98ms, tests 116ms, environment 5.43s)
```

---

## 🧪 Test Coverage

### Contract tests (`cargo test`) — 6 tests

| Test | What it verifies |
|---|---|
| `test_join_gives_initial_balance` | New member receives exactly 5 TIME tokens |
| `test_cannot_join_twice` | Duplicate join panics with correct message |
| `test_list_service_increments_id` | Service IDs auto-increment correctly |
| `test_book_and_confirm_transfers_tokens` | Full escrow flow produces correct balances |
| `test_cannot_book_without_enough_tokens` | Underfunded booking is rejected |
| `test_cannot_book_own_service` | Self-booking is rejected |

### Frontend tests (`npm test`) — 11 tests across 3 files

**`wallet.test.js`** — 3 tests covering:
- Wallet connects successfully via Freighter
- Disconnected state resets address to null
- Error state set when Freighter is not installed

**`balance.test.js`** — 3 tests covering:
- Balance returns correct value from cache on hit
- Balance fetches fresh value on cache miss
- Balance returns 0 for a non-member address

**`cache.test.js`** — 5 tests covering:
- Store and retrieve a value within TTL
- Expired entries return `null`
- Missing keys return `null`
- `invalidate` removes a specific key
- `clear` removes all `tb_` prefixed keys only

---



### Caching
Contract reads use a two-layer cache:

```
getActiveServices()  →  cache.get('active_services')
                         └─ HIT:  return immediately, revalidate in background (SWR)
                         └─ MISS: fetch from RPC, populate cache, call onUpdate()
```



## 🌐 Deployment

The frontend is deployed to Vercel automatically on push to `main`.

```bash
# Manual deploy
npm run build
vercel --prod
```

Set `VITE_CONTRACT_ID` as an environment variable in your Vercel project settings.

---

## 📝 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_CONTRACT_ID` | Deployed Soroban contract address | Yes |

Copy `.env.example` to `.env` for local development.

---



---

## 🛣️ Future Improvements

- [ ] Dispute resolution — third-party arbitration for contested escrows
- [ ] Service categories and search/filter
- [ ] Reputation scores based on completed bookings
- [ ] Mobile-responsive PWA with push notifications
- [ ] Multi-session Escrows Creation (recurring services)

---

## 📄 License

MIT © 2025 — built for the Stellar Journey to Mastery Orange Belt challenge.
