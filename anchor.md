# ClaimGuard Anchor — Single Source of Truth

> **MANDATORY**: Any agent or developer working on this codebase **MUST read this file first** before touching code.
> **Tagline:** Compliance and lien state that travels with the asset.
> **Network:** Portaldot V3 Testnet | **Track:** Ecosystem DApps (RWA / DeFi) | **Event:** Portaldot Hacker House 2026 (DoraHacks)

---

## 0. Live Session State

**Current Status:** Day 1 — Blocks 0 to 4, plus Blocks A, B, C, D, E, F completed! Ready for Block 6 & 7 / Testnet deployment once tokens land.
**Last Updated:** 2026-10-29

### Sprint Progress
- [x] **Block 0: Pre-flight & Testnet Verification**:
  - Runtime: `portaldot-v3` (specVersion: 3002).
  - Pallets: `contracts` (ink! WASM contracts) + `revive` (PolkaVM/EVM) enabled.
  - ink! version: `5.1.1` (compiled with Rust 1.85.0 & cargo-contract 5.0.3).
  - Testnet Deployment Verified: Deployed `scratch_flipper` to testnet. Address: `5Ef9UzUx2uqJvZBQkpKxAjwF5aif3sbiN3WB4E7XEmZUjqJX`, Block Hash: `0xd15a10480e97302ccdb017681bea249f33c8c2360ffc18732c3d6bba7c2ab265`.
  - Storage Deposit Constants: `depositPerByte = 6,000,000,000,000` (6 * 10^12), `depositPerItem = 15,000,000,000,000`.
- [x] **Block 1: Repo and Scaffold**:
  - Workspace layout created matching Section 10 specification.
  - `claimguard_core`, `sdk`, `scripts`, `docs` organized.
- [x] **Block 2: Data Model, Register, and Acknowledge**:
  - Core types (`Claim`, `Lien`, `ClaimStatus`, `VerificationStatus`, `ClaimSnapshot`).
  - Storage mappings (`claims`, `doc_hash_to_claim`, `liens`, `claim_lien_count`, `snapshot_nonce`).
  - `register_claim` rejects duplicate `doc_hash`, zero face value, and past maturity dates.
  - `acknowledge` enforces buyer authorization and proper state transitions.
- [x] **Block 3: Rules, Pledge, Release, Transfer**:
  - 7 invariant rules implemented in `rules.rs`.
  - `pledge()` strictly checks maximum advance rate bps (`ExceedsAdvanceRate` revert).
  - `release()` updates active lien status, decrements total pledged.
  - Added dedicated `settle_claim()` callable only when `total_pledged == 0` (separating lien release from buyer payment settlement).
  - `transfer_claim()` enforces TransferLock (`total_pledged == 0`) and Jurisdiction check.
  - Read getters (`get_claim`, `get_lien`, `get_total_pledged`, `get_max_pledge_allowed`, `is_claim_pledgeable`, `get_liens_for_claim`).
- [x] **Block 4: Comprehensive Attack & Invariant Tests**:
  - 11/11 unit and integration tests passing (`cargo test`):
    1. `test_register_and_acknowledge`
    2. `test_double_pledge_rejected`
    3. `test_split_pledge_and_release`
    4. `test_maturity_and_jurisdiction`
    5. `test_unauthorized_callers`
    6. `test_transfer_and_subsequent_pledge`
    7. `test_disallowed_jurisdiction_transfer`
    8. `test_verified_only_enforcement` (spec match: blocks pledges on unverified claims when required)
    9. `test_bonded_verification_fake_invoice_slashed`
    10. `test_bonded_verification_valid_invoice_cleared`
    11. `test_export_snapshot_and_validation`
- [x] **Block A: Storage Deposit & Real Balance Audit**:
  - Reconciled wallet balance on testnet: Initial drop = 335.72 tPOT, Flipper deposit reserved = 187.26 tPOT, Gas = ~2.08 tPOT, Current free balance = 146.38 tPOT (`14,638,091,236,568,846` base units).
  - Exact core deploy deposit: $27,559 \text{ bytes} \times 0.06\text{ tPOT/byte} \approx 1,654\text{ tPOT}$.
  - Total realistic faucet ask: **2,500 tPOT** (not 50,000 tPOT), covering core deployment (~1,654 tPOT) + demo accounts (4 $\times$ 50 tPOT = 200 tPOT) + buffer.
- [x] **Block B: Contract Shrinking**:
  - Optimized release profile with `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, and `overflow-checks = false`.
  - Merged verification and tightened data types (`[u8; 2]` for jurisdiction, `[u8; 4]` for currency, `[u8; 32]` for doc hash). Wasm binary size is 27.56 KB with complete feature set.
- [x] **Block C: Merged Verification into Core**:
  - Merged `BondedVerification` directly into `claimguard_core` (`assert_valid`, `challenge`, `resolve`, `finalize`, `get_assertion`).
  - Saved an entire contract deployment deposit (~1,500+ tPOT) and removed cross-contract call failure risk.
  - Aligned `VerifiedOnly` rule with spec: requires `VerificationStatus::Verified` before pledging when `require_verified == true`.
  - Fixed settlement logic: releasing a lien does NOT mark a claim `Settled`. Added explicit `settle_claim` message.
- [x] **Block D: Local Node Verification (`substrate-contracts-node`)**:
  - Ran `substrate-contracts-node` v0.42.0 locally.
  - Deployed `claimguard_core` and executed real end-to-end on-chain lifecycle: register $\rightarrow$ buyer acknowledge $\rightarrow$ bonded assertion $\rightarrow$ resolve valid $\rightarrow$ Lender A ₹800,000 pledge $\rightarrow$ Lender B double-pledge attempt $\rightarrow$ lien release $\rightarrow$ buyer settlement.
  - Confirmed on real chain:
    1. Double-pledge reverted cleanly; state was protected (`total_pledged` remained at 800,000).
    2. Ink! drops events on `Err` return; validated SDK dry-run simulation pattern for invariant violation logging.
- [x] **Block E: TypeScript SDK**:
  - SDK implemented in `sdk/src/index.ts` with `checkInvariants`, `pledge`, `getLienStatus`, and `getViolationLog`.
  - Compiled to `dist/index.js` and `dist/index.d.ts` without errors.
- [x] **Block F: End-to-End Demo Script**:
  - Created `scripts/demo_flow.mjs` supporting `--target local` and `--target testnet`.
  - Executed successfully against local dev node with formatted step-by-step reporting.
- [x] **Block G: Funding Follow-up**:
  - Formulated precise faucet request of 2,500 tPOT for Discord admin follow-up. Deploy script ready for execution (`node scripts/deploy_core.mjs`) once funded.
- [x] **Block 11: Signed Snapshot & Lender B Cross-Chain Gateway**:
  - Implemented `exportSnapshot`, `signSnapshot`, and `verifySnapshot` with cryptographic signature verification in `@claimguard/sdk`.
  - Created `scripts/relayer.mjs` to extract and sign canonical state snapshots from the core contract.
  - Created `scripts/lender_b_verifier.mjs` demonstrating: (1) cross-chain double-pledge interception when invoice is pledged on origin, (2) tamper attack interception (hash mismatch), and (3) replay attack interception (nonce checking).
- [x] **Block 12: Interactive Dashboard (Frontend)**:
  - Scaffolding and production build of `frontend/` using Vite + React + TypeScript with custom glassmorphism dark-mode design system (`index.css`).
  - Implemented 5 primary tabs: Receivables Registry, Double-Pledge Defense Simulator, Bonded Verification, Cross-Chain Gateway, and Real-Time Invariant Audit Feed.
  - Verified in browser with subagent taking visual snapshot proofs.
- [x] **Block 13: README & Trust Model Documentation**:
  - Comprehensive rewrite of `README.md` including Meena's problem story, 4-layer trust stack, architecture diagram, 11/11 unit & attack test results, 5-line SDK guide, reproducible demo commands, and honest trust model disclosures.

---

## 1. Project Overview & The North Star

### 1.1 The Human Story
Meena runs a garment-manufacturing unit in Tiruppur, Tamil Nadu. She ships goods worth ₹10,00,000 to a large retailer with 90-day payment terms. She needs cash against that invoice today to pay wages, yarn suppliers, and electricity.

Lenders hesitate because of:
1. **Double-financing risk:** The same invoice can be pledged to Lender A and Lender B. The second lender loses money.
2. **Lost context:** Invoice data (buyer acknowledgment, due date, jurisdiction, prior liens) is lost across fragmented platforms.
3. **Repeated verification:** Each lender re-verifies everything manually, inflating interest rates and processing time.

### 1.2 The Solution
ClaimGuard turns receivables into on-chain claims with attached **invariants** (rules) that travel with the claim across apps and chains.
- **LienManager:** Single source of truth. A second pledge exceeding the max advance rate reverts on-chain.
- **InvariantEngine:** Pluggable rule modules (Jurisdiction, Buyer Acknowledged, Transfer Lock, Advance Rate, Maturity, Verification).
- **BondedVerification (Truth Layer):** Optimistic assertion with financial bonds. Fake invoices lose bonds to challengers.
- **CrossChainGateway:** Signed snapshots allowing any destination app to trust lien state without re-verifying from scratch.

---

## 2. System Architecture & Layers

```text
                                 ┌──────────────────────────────────────┐
                                 │       MSME Supplier / Issuer        │
                                 └──────────────────┬───────────────────┘
                                                    │ register_claim()
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ claimguard_core (Unified ink! 5.1.1 Smart Contract on Portaldot V3)                             │
│                                                                                                 │
│  ┌─────────────────────────┐     ┌─────────────────────────┐     ┌───────────────────────────┐  │
│  │   Receivables Registry  │────►│     Invariant Engine    │────►│        LienManager        │  │
│  │  (Claim State & Storage)│     │  (7 Invariant Rules)    │     │   (Single Lien Truth)     │  │
│  └────────────┬────────────┘     └─────────────────────────┘     └─────────────┬─────────────┘  │
│               │                                                                │                │
│               ▼                                                                ▼                │
│  ┌─────────────────────────┐                                     ┌───────────────────────────┐  │
│  │   Bonded Verification   │                                     │     Snapshot Exporter     │  │
│  │      (Truth Layer)      │                                     │  (Cryptographic State)    │  │
│  └─────────────────────────┘                                     └─────────────┬─────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┼────────────────┘
                                                                                 │ signed snapshot (sr25519)
                                                                                 ▼
                                                                   ┌───────────────────────────┐
                                                                   │ Second Environment        │
                                                                   │ (Simulated Verifier)      │
                                                                   └───────────────────────────┘
```

---

## 3. Portaldot V3 Runtime & Chain Constraints

| Parameter | Portaldot V3 Testnet Value | Notes |
| :--- | :--- | :--- |
| **Spec Name** | `portaldot-v3` | Substrate runtime |
| **Spec Version** | `3002` |pallet-revive enabled |
| **EVM Chain ID** | `420420777` (`0x190f1ca9`) | Standard EVM JSON-RPC mapping via eth-rpc |
| **EVM RPC** | `https://test-evm-rpc-v3.portaldot.dev` | Supports standard JSON-RPC queries & deployment |
| **Substrate WS** | `wss://test-node-v3.portaldot.dev` | Substrate WebSocket |
| **Substrate HTTP** | `https://test-node-v3.portaldot.dev` | Substrate JSON-RPC |
| **Address Format** | SS58 starting with `5` (Native) / `0x` (EVM) | Native POT addresses required for faucet distribution |
| **Explorer** | `https://node-console.portaldot.dev/` | Block and extrinsic inspection |

---

## 4. Contract Specifications: `claimguard_core`

`claimguard_core` combines the `ClaimRegistry`, `InvariantEngine`, and `LienManager` into an efficient, robust ink! smart contract.

### 4.1 Data Model (Section 5.1 Specification)

#### Types & Enums
```rust
pub type ClaimId = u64;
pub type Hash256 = [u8; 32];
pub type Balance = u128;
pub type Timestamp = u64;

#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ClaimStatus {
    Registered,
    Acknowledged,
    Pledged,
    Settled,
    Defaulted,
    Cancelled,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum VerificationStatus {
    Unverified,
    Asserted,
    Disputed,
    Verified,
    Rejected,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Claim {
    pub id: ClaimId,
    pub issuer: AccountId,
    pub buyer: AccountId,
    pub face_value: Balance,
    pub currency_code: [u8; 4], // e.g., b"INR\0" or b"USDC"
    pub due_date: Timestamp,
    pub doc_hash: Hash256,
    pub status: ClaimStatus,
    pub verification: VerificationStatus,
    pub max_advance_rate_bps: u16, // basis points, e.g. 8000 = 80.00%
    pub allowed_jurisdiction: [u8; 2], // e.g., b"IN", b"SG", b"US"
    pub registered_at: Timestamp,
    pub total_pledged: Balance,
}

#[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Lien {
    pub lien_id: u32,
    pub claim_id: ClaimId,
    pub lender: AccountId,
    pub amount: Balance,
    pub timestamp: Timestamp,
    pub active: bool,
}
```

#### Error Codes
```rust
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Error {
    ClaimNotFound,
    DuplicateDocHash,
    Unauthorized,
    InvalidStatusTransition,
    ClaimPastMaturity,
    BuyerNotAcknowledged,
    ExceedsAdvanceRate,
    ClaimFrozenOrLocked,
    NotVerified,
    ClaimRejected,
    DisallowedJurisdiction,
    LienNotFound,
    LienAlreadyInactive,
    ArithmeticOverflow,
}
```

#### Events
- `ClaimRegistered { claim_id: ClaimId, issuer: AccountId, buyer: AccountId, face_value: Balance, doc_hash: Hash256 }`
- `ClaimAcknowledged { claim_id: ClaimId, buyer: AccountId }`
- `LienRecorded { claim_id: ClaimId, lien_id: u32, lender: AccountId, amount: Balance, new_total_pledged: Balance }`
- `LienReleased { claim_id: ClaimId, lien_id: u32, lender: AccountId, amount: Balance }`
- `ClaimSettled { claim_id: ClaimId }`
- `InvariantViolationAttempt { claim_id: ClaimId, rule_name: [u8; 32], actor: AccountId, attempted_amount: Balance }`

---

## 5. The Seven Invariant Rules

Every transfer or pledge runs through the Invariant Engine:

1. **`ValidDocHash` (Anti-Duplicate Check):** No two claims can have the same document hash. Prevents registering the exact same invoice twice under different IDs.
2. **`BuyerAcknowledged`:** A claim cannot be pledged until the buyer explicitly acknowledges the invoice on-chain.
3. **`MaxAdvanceRate`:** Total active liens on a claim cannot exceed `face_value * max_advance_rate_bps / 10000`. Double-pledge attempts that breach this limit revert immediately with `ExceedsAdvanceRate`.
4. **`MaturityCheck`:** No new pledge can be registered if current block timestamp >= `due_date`.
5. **`TransferLock`:** When a claim has active liens (`total_pledged > 0`), ownership cannot be transferred.
6. **`JurisdictionAllowlist`:** The claim holder/receiver must belong to the approved jurisdiction country code.
7. **`VerifiedOnly` (Truth Layer Coupling):** If configured, claims must have `VerificationStatus::Verified` before being pledged. Any claim marked `Rejected` is permanently locked.

---

## 6. TypeScript SDK Specification (Section 6)

Lenders and protocols integrate ClaimGuard in approximately 5 lines of code:

```typescript
import { ClaimGuard } from "@claimguard/sdk";

const cg = new ClaimGuard({ rpcUrl, contractAddress, signer });

// 1. Check invariants before executing loan
const check = await cg.checkInvariants(claimId, "pledge", lenderAddress, loanAmount);
if (!check.allowed) {
  throw new Error(`Pledge blocked by rule: ${check.violatedRule}`);
}

// 2. Record pledge and enforce lien
const tx = await cg.pledge(claimId, lenderAddress, loanAmount);
console.log(`Lien recorded in tx: ${tx.hash}`);

// 3. Query shared lien status across all chains
const status = await cg.getLienStatus(claimId);
console.log(`Current advance rate: ${status.currentAdvanceRatePct}%`);
```

---

## 7. 2-Minute Demo Script (Section 8)

| Timing | Visual / Action | Narration Point |
| :--- | :--- | :--- |
| **0:00 - 0:15** | Problem slide: Meena ships ₹10,00,000 goods, waits 90 days. | *"Suppliers wait 90 days for payment. Lenders fear double-pledging. Honest suppliers suffer."* |
| **0:15 - 0:30** | Terminal / Explorer: Meena registers `INV-1042` with hash on Portaldot V3. | *"Meena registers her invoice on ClaimGuard. Key facts and document provenance hash are sealed on-chain."* |
| **0:30 - 0:45** | Retailer wallet calls `acknowledge()`. | *"Buyer acknowledges invoice liability on-chain. Rule 'BuyerAcknowledged' flips from red to green."* |
| **0:45 - 1:00** | Lender A pledges ₹8,00,000 (80% advance rate limit). Lien recorded. | *"Lender A funds Meena with an 80% advance. The lien is registered into the shared LienManager."* |
| **1:00 - 1:15** | Lender B tries to pledge ₹8,00,000 on the same invoice. **Tx Reverts!** | *"A fraudster tries to pledge the same invoice to Lender B. ClaimGuard rejects it on-chain: ExceedsAdvanceRate!"* |
| **1:15 - 1:30** | Bonded Verification demo: Fake invoice challenged, bond slashed. | *"Fake invoices? Bonded verification makes fraudsters lose real capital when challenged."* |
| **1:30 - 1:45** | Dashboard feed: "Double-Pledge Blocked", Cross-chain snapshot view. | *"Cross-chain lenders read signed snapshots. One invoice, one lien, across every chain."* |
| **1:45 - 2:00** | Code snippet: 5-line SDK integration & closing pitch. | *"Bridges move tokens. ClaimGuard moves trust. Compliance that travels with the asset."* |

---

## 8. Cross-Chain Approach & Trust Model

### 8.1 Signed Snapshot Protocol (Simulated Second Environment)
> **Honest Disclosure:** Signed snapshot verified by a second environment (simulated). Relayer is a trusted signer.

1. Core contract exports a cryptographic state snapshot: `{ claim_id, status, verification, face_value, total_pledged, max_advance_rate_bps, require_verified, nonce, timestamp, expiry }`.
2. Relayer service signs the canonical snapshot hash using an authorized **`sr25519`** cryptographic key pair.
3. Destination verifier (`scripts/lender_b_verifier.mjs` / Lender B Verifier) checks `nonce` (replay protection), `expiry` (freshness), and signature integrity via `@polkadot/util-crypto` `signatureVerify`.
4. Secondary lenders and DeFi protocols verify the signed snapshot to intercept double-pledging across disconnected chains without needing complex multi-sig bridges.

### 8.2 Honest Trust Model Disclosures
- **Resolver:** Single admin account in MVP. Roadmap: 2-of-3 multisig, decentralized dispute resolver / UMA oracle.
- **Relayer:** Trusted signer in MVP. Roadmap: BEEFY light-client / threshold signature bridge.
- **Vigilance:** Optimistic challenges require challengers or watcher bots. Mitigated by buyer financial incentive and bond scaling.
- **Cross-Chain:** Signed snapshot verified by a second environment (simulated). Calling it a bridge overclaims.

---

## 9. DoraHacks Evaluation Matrix

| Criterion | DoraHacks Weight | How ClaimGuard Wins |
| :--- | :--- | :--- |
| **Technical Feasibility** | **30%** | Unified ink! 5.1.1 WASM smart contract (`claimguard_core`), 20/20 passing unit and attack tests, real testnet tx hashes, reproducible SDK and demo scripts. |
| **Innovation** | **30%** | Solves the unaddressed RWA double-pledging problem with unified state and bonded attestation rather than simple token bridging. |
| **Ecosystem Contribution** | **20%** | 5-line TypeScript SDK allowing any Portaldot DeFi lending pool to safely accept real-world receivables. |
| **Business Potential** | **20%** | Targets the multi-trillion-dollar MSME trade finance gap with clear monetization (basis-point protocol fees on liens and settle). |

---

## 10. Repository Layout

```text
ClaimGuard/
├── README.md                          # Universal Project Overview, Trust Model & Quickstart
├── anchor.md                          # Single source of truth (this document)
├── LICENSE                            # Apache-2.0 Open Source License
├── .env.example                       # Clean environment variables template with empty values
├── .env                               # Local secrets (ignored by git, never committed)
├── Cargo.toml                         # Workspace Cargo configuration (overflow-checks = true)
├── deployments.json                   # Tracked contract addresses & on-chain tx hashes
├── contracts/
│   └── claimguard_core/               # Merged Core: Registry, LienManager, BondedVerification
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs                 # Contract entrypoint, 20/20 unit & attack tests
│           ├── types.rs               # Data structures, enums, structs
│           ├── errors.rs              # Error taxonomy (including security variants)
│           ├── events.rs              # Event definitions (including LenderApproved, InvariantViolationAttempt)
│           └── rules.rs               # 7 Invariant validation functions
├── data/
│   └── violations.json                # Persistent violation audit log (file-backed)
├── sdk/                               # TypeScript SDK for lenders & builders
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # Main ClaimGuard SDK (with persistent audit & tx error capture)
│       └── types.ts                   # TypeScript interfaces
├── scripts/
│   ├── deploy_core.mjs                # Portaldot V3 core contract deployment
│   ├── deploy_flipper.mjs             # Portaldot V3 toolchain verification deployment
│   ├── demo_flow.mjs                  # Interactive 2-minute CLI demo
│   ├── test_local_flow.mjs            # End-to-end substrate-contracts-node integration runner
│   ├── relayer.mjs                    # Cryptographic snapshot signer (sr25519)
│   └── lender_b_verifier.mjs          # Simulated second environment snapshot verifier
├── frontend/                          # React + TypeScript + Vite Dashboard (Theme: "Ledger")
│   ├── package.json
│   ├── index.html
│   └── src/
└── docs/                              # Project reference documentation
```

---

## 11. Invariants & Non-Negotiable Rules (DO NOT CHANGE)

1. **Fail-Closed Security:** Any unverified, disputed, or over-limit claim must strictly block pledges and transfers.
2. **Double-Pledge Impossibility:** `pledge()` must check `total_pledged + amount <= max_advance_limit`. If exceeded, it MUST revert with `ExceedsAdvanceRate`.
3. **No Phantom State:** All state modifications must be persisted in contract storage and accompanied by corresponding events.
4. **Honest Limitations:** Always state clearly that the MVP resolver and relayer use trusted signers, with decentralized roadmaps.
5. **No Placeholders in Final Submissions:** Every hash, link, and code snippet must be real and functional.

---

## 12. Block 0 Pre-Flight Findings & Live Parameters

| Item | Verified Value | Details |
| :--- | :--- | :--- |
| **Contract Engine** | `pallet-contracts` (WASM) & `pallet-revive` (PolkaVM/EVM) | Both pallets enabled in Substrate runtime (`portaldot-v3`) |
| **ink! Version** | `5.1.1` | Built with Rust `1.85.0` and `cargo-contract 5.0.3` |
| **Substrate WS RPC** | `wss://test-node-v3.portaldot.dev` | Chain Spec: `portaldot-v3`, specVersion: `3002` |
| **Substrate HTTP RPC**| `https://test-node-v3.portaldot.dev` | Standard JSON-RPC |
| **EVM RPC** | `https://test-evm-rpc-v3.portaldot.dev` | Chain ID `420420777` (`0x190f1ca9`) |
| **Token Symbol & Decimals** | `tPOT`, `14` decimals | Native testnet gas token |
| **Storage Deposit Rates** | `6,000,000,000,000` per byte (`6 * 10^12`), `15,000,000,000,000` per item | Enforced on code upload and instantiation |
| **Faucet Access** | Discord Ticket / Admins `@Stella707827`, `@titus242471` | Native SS58 address starting with `5` |
| **Block Explorer** | `https://node-console.portaldot.dev/` | Extrinsics, contracts, block exploration |
| **DoraHacks Deadline** | **Nov 6, 2026 04:00 UTC** | Code freeze & submission deadline |
| **Evaluation Criteria**| Technical Feasibility (30%), Innovation (30%), Ecosystem Contribution (20%), Business Potential (20%) | Hackathon track: Ecosystem DApps (RWA / DeFi) |

---

## 13. Live Deployment & Node Verification Registry

| Target / Contract | Address | Code Hash / Block Hash | Status |
| :--- | :--- | :--- | :--- |
| **Testnet: Flipper (Pre-flight)** | `5Ef9UzUx2uqJvZBQkpKxAjwF5aif3sbiN3WB4E7XEmZUjqJX` | Block: `0xd15a10480e97302ccdb017681bea249f33c8c2360ffc18732c3d6bba7c2ab265` | **Live & Finalized on Testnet** |
| **Local: ClaimGuard Core (All-in-one)** | `5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy` | `substrate-contracts-node` (v0.42.0) | **100% Tested & Verified On-Chain** |
| **Testnet: ClaimGuard Core** | Pending Deposit Top-up (Ask: 2,500 tPOT at `5CXXcLDkPrtviD8yadPi2ewQYUyKQfjFbnwjZJUqijudz8JB`) | Ready to deploy via `scripts/deploy_core.mjs` | Size: 31.2 KB Wasm bundle (`overflow-checks = true`) |
| **Bonded Verification** | Merged into `claimguard_core` | Internal contract module | **Complete & Verified** (saves 1,500+ tPOT deploy) |
| **Lender B Verifier** | Simulated second environment (`scripts/lender_b_verifier.mjs`) | Verified via `sr25519` cryptographic signatures | **Complete & Verified** |

---

## 14. Change & Sprint Session Log

| Date | Block / Milestone | Changes Made | Status |
| :--- | :--- | :--- | :--- |
| **2026-10-27** | Block 0: Pre-Flight | Portaldot V3 parameters inspected; connected via `@polkadot/api`; deployed testnet `flipper` contract (`5Ef9UzUx2uqJvZBQkpKxAjwF5aif3sbiN3WB4E7XEmZUjqJX`). | Completed |
| **2026-10-27** | Block 1: Scaffold | Repository layout structured, anchor.md added, workspace Cargo configured. | Completed |
| **2026-10-27** | Block 2: Data Model & Registry | `Claim`, `Lien`, `ClaimSnapshot`, `register_claim`, duplicate `doc_hash` rejection, and `acknowledge` implemented and tested. | Completed |
| **2026-10-27** | Block 3: Rules & LienManager | 7 Invariant rules built (`ValidDocHash`, `BuyerAcknowledged`, `MaxAdvanceRate`, `MaturityCheck`, `TransferLock`, `JurisdictionAllowlist`, `VerifiedOnly`); `pledge`, `release`, `transfer_claim`, getters implemented. | Completed |
| **2026-10-27** | Block 4: Attack Tests | 9 comprehensive tests written and passing: double-pledge rejection, split pledges over limit, release cycle, maturity enforcement, unauthorized caller rejection across all mutations, transfer with jurisdiction and locks. | Completed |
| **2026-10-27** | Block 5: Core Testnet Deploy | Release build optimized to 20.6 KB; automated deploy script created; testnet dry-run executed; deposit calculation verified. | Tested & Verified |
| **2026-10-29** | Block A: Deposit & Balance Math | Reconciled wallet balance: initial drop 335.72 tPOT, flipper reserved 187.26 tPOT, gas ~2.08 tPOT, free balance = 146.38 tPOT. Exact deploy need: $27,559 \times 0.06 = 1,654\text{ tPOT}$; requesting **2,500 tPOT** total. | Completed |
| **2026-10-29** | Block B: Shrinking Profile | Enabled `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`. Wasm binary size optimized. | Completed |
| **2026-10-29** | Block C: Verification & Rule Merging | Merged `BondedVerification` directly into `claimguard_core` (`assert_valid`, `challenge`, `resolve`, `finalize`, `get_assertion`). Aligned `VerifiedOnly` rule with spec. Added dedicated `settle_claim`. | Completed |
| **2026-10-29** | Block D: Local Node Verification | Ran `substrate-contracts-node` (v0.42.0). Deployed `claimguard_core` and confirmed double pledge reverts cleanly while state remains clean. | Completed |
| **2026-10-29** | Block E: TypeScript SDK | Implemented `@claimguard/sdk` with `checkInvariants`, `pledge`, `getLienStatus`, and `getViolationLog`. | Completed |
| **2026-10-29** | Block F: Demo Flow Script | Created `scripts/demo_flow.mjs` providing a full interactive demo across the entire lifecycle. | Completed |
| **2026-10-29** | Block 11: Signed Snapshot & Lender B | Built `scripts/relayer.mjs` and `scripts/lender_b_verifier.mjs`. Verified double-pledge defense, tamper defense, and replay defense. | Completed |
| **2026-11-01** | Day 1: Block 1 — Funding Plan | Recorded 2,500 tPOT request at `5CXXcLDkPrtviD8yadPi2ewQYUyKQfjFbnwjZJUqijudz8JB`, fallback date Nov 3 IST. | Completed |
| **2026-11-01** | Day 1: Block 2 — Security Fixes | **Correction 2:** Fixed pledge authorization hole: added `approve_lender(claim_id, lender, max_amount)` and `get_lender_approval`. Lenders cannot pledge without issuer consent (anti-griefing). **Correction 3:** Set `overflow-checks = true` in Cargo.toml profile. Audited all balance math with `checked_*` returning `ArithmeticOverflow`. **Correction 9:** Bond accounting edge cases handled (cannot challenge self, challenge after window rejected, finalize twice rejected, resolve unchallenged rejected, duplicate assertion rejected, zero bond rejected, 90/10 split verified). **Correction 10:** Enforced millisecond consistency across block timestamps and challenge/snapshot windows. **20 of 20 unit and attack tests passing!** Release Wasm size 31.2 KB. | Completed |
| **2026-11-01** | Day 1: Block 3 — Secrets & Hygiene | **Correction 6:** Removed all hardcoded seeds from deploy scripts, scanned git log, verified `.env` ignored, cleaned `.env.example`. **Correction 15:** Added Apache-2.0 `LICENSE`, created `deployments.json` schema. | Completed |
| **2026-11-01** | Day 1: Block 4 — Persistent Violation Log | **Correction 5:** Persisted violation audit log to `data/violations.json` and browser `localStorage`. Updated `pledge` to support `options.skipDryRun` for capturing real failed extrinsics and tx hashes. | Completed |
| **2026-11-01** | Day 2: Block 6 — Design System & Shell | Implemented institutional "Ledger" design tokens in `frontend/src/index.css` (navy brand `#12304F`, teal accent `#0E9F8E`, neutral `#0D1821`, tabular figures). Built `AppShell` with collapsible 240px sidebar, live network badge (`#3002`), role switcher (`Issuer`, `Buyer`, `Lender`, `Challenger`, `Resolver`), theme toggle (light/dark), and global `TxToast`. Created signature components: `StatusChip`, `StatusStepper`, `AdvanceMeter`, `RuleChecklist`, `BlockBanner`, `HashChip`. | Completed |
| **2026-11-01** | Day 2: Block 7 — Landing Page & Overview | Built `LandingPage` (`/`) with Source Serif 4 headline, subline, 3-step explainer, live proof strip (contract address, latest tx hash, blocked count, total pledged). Built `OverviewPage` (`/app`) with 4 stat cards, role-specific "Needs your attention" panel, and real-time activity table. | Completed |
| **2026-11-01** | Day 2: Block 8 — Claims List & Wizard | Built `ClaimsListPage` (`/app/claims`) with multi-filter search, scope toggle (mine vs all), and capacity meters. Built 3-step `RegisterClaimWizard` (`/app/claims/new`) with commercial terms, browser-side SHA-256 calculation (`crypto.subtle.digest`) guaranteeing zero raw data leakage, and 7-rule pre-flight checklist. Verified all routes end-to-end via browser subagent. | Completed |
