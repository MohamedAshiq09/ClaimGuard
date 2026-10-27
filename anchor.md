# ClaimGuard Anchor — Single Source of Truth

> **MANDATORY**: Any agent or developer working on this codebase **MUST read this file first** before touching code.
> **Tagline:** Compliance and lien state that travels with the asset.
> **Network:** Portaldot V3 Testnet | **Track:** Ecosystem DApps (RWA / DeFi) | **Event:** Portaldot Hacker House 2026 (DoraHacks)

---

## 0. Live Session State

**Current Status:** Day 1 — Block 0 (Pre-flight) & Block 1 (Repo & Scaffold).
**Last Updated:** 2026-10-27

### Sprint Progress
- [x] **DoraHacks Evaluation & Timeline Extracted**: 
  - Submission Deadline / Code Freeze: **Nov 6, 2026 04:00 UTC**.
  - Evaluation Criteria: Technical Feasibility (30%), Innovation (30%), Ecosystem Contribution (20%), Business Potential (20%).
  - Prize Pool: 5,200 USDT (Grand Prize: 1,000 USDT, Track 1st: 800 USDT, Ecosystem DApps 2nd & 3rd: 500 & 300 USDT).
- [x] **Portaldot V3 Testnet Parameters Confirmed**:
  - Substrate RPC (WS): `wss://test-node-v3.portaldot.dev`
  - Substrate JSON-RPC (HTTP): `https://test-node-v3.portaldot.dev` (specVersion: 3002, specName: `portaldot-v3`)
  - EVM RPC (HTTP): `https://test-evm-rpc-v3.portaldot.dev` (Chain ID: `420420777` / `0x190f1ca9`, Client: `eth-rpc/main-fddd431`)
  - Explorer: `https://node-console.portaldot.dev/`
  - Faucet / Test Tokens: SS58 native POT address (starting with `5`) requested via Discord support ticket or admins `@Stella707827` / `@titus242471`.
- [x] **Docs & PRD Synchronized**: Combined Project Document written to `docs/README.md`.
- [x] **Repository Layout Defined**: Full directory structure created per Section 10.
- [x] **Scaffolding**: `claimguard_core` contract scaffolded with Rust/ink!, types, storage, and error definitions.

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
│ ClaimGuard Protocol (Portaldot V3)                                                              │
│                                                                                                 │
│  ┌───────────────────────┐          ┌───────────────────────┐         ┌──────────────────────┐  │
│  │     ClaimRegistry     │◄────────►│     ClaimToken        │────────►│  InvariantEngine     │  │
│  │   (Storage & State)   │          │      (PSP34)          │         │  (Pluggable Rules)   │  │
│  └───────────┬───────────┘          └───────────────────────┘         └──────────┬───────────┘  │
│              │                                                                   │              │
│              │                                                                   ▼              │
│              │                      ┌───────────────────────┐         ┌──────────────────────┐  │
│              └─────────────────────►│      LienManager      │◄────────┤  7 Rule Modules      │  │
│                                     │  (Single Lien Truth)  │         │  (Jurisdiction, etc) │  │
│                                     └───────────┬───────────┘         └──────────────────────┘  │
│                                                 │                                               │
│                                                 ▼                                               │
│                                     ┌───────────────────────┐                                   │
│                                     │   CrossChainGateway   │                                   │
│                                     │  (Signed Snapshots)   │                                   │
│                                     └───────────┬───────────┘                                   │
└─────────────────────────────────────────────────┼───────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │ Destination Verifier  │
                                      │    (Other Chains)     │
                                      └───────────────────────┘
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

### 8.1 Signed Snapshot Protocol
1. Core contract exports a cryptographic state snapshot: `{ claim_id, status, verification, total_pledged, lenders_root, nonce, expiry }`.
2. Relayer service signs the snapshot with an authorized ECDSA/Ed25519 signer key.
3. Destination verifier contract checks `nonce` (replay protection), `expiry` (freshness), and signature.
4. Destination DeFi protocols read from the verifier as local truth.

### 8.2 Honest Trust Model Disclosures
- **Resolver:** Single admin account in MVP. Roadmap: 2-of-3 multisig, decentralized dispute resolver / UMA oracle.
- **Relayer:** Trusted signer in MVP. Roadmap: BEEFY light-client / threshold signature bridge.
- **Vigilance:** Optimistic challenges require challengers or watcher bots. Mitigated by buyer financial incentive and bond scaling.

---

## 9. DoraHacks Evaluation Matrix

| Criterion | DoraHacks Weight | How ClaimGuard Wins |
| :--- | :--- | :--- |
| **Technical Feasibility** | **30%** | Modular ink! WASM/revive smart contracts, passing unit and attack tests, real testnet tx hashes for all operations, reproducible SDK and demo scripts. |
| **Innovation** | **30%** | Solves the unaddressed RWA double-pledging problem with unified state and bonded attestation rather than simple token bridging. |
| **Ecosystem Contribution** | **20%** | 5-line TypeScript SDK allowing any Portaldot DeFi lending pool to safely accept real-world receivables. |
| **Business Potential** | **20%** | Targets the multi-trillion-dollar MSME trade finance gap with clear monetization (basis-point protocol fees on liens and settle). |

---

## 10. Repository Layout (Section 10 Specification)

```text
ClaimGuard/
├── anchor.md                          # Single source of truth (this document)
├── .env.example                       # Environment variables template
├── .env                               # Local secrets (ignored by git)
├── Cargo.toml                         # Workspace Cargo configuration
├── contracts/
│   ├── claimguard_core/               # Core Registry, LienManager, InvariantEngine
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs                 # Contract entrypoint & messages
│   │       ├── types.rs               # Data structures, enums, structs
│   │       ├── errors.rs              # Error taxonomy
│   │       ├── events.rs              # Event definitions
│   │       └── rules.rs               # Invariant validation functions
│   ├── bonded_verification/           # Bonded assertion & challenge contract (Day 2)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── demo_lending_pool/             # Consumer lender pool demonstrating SDK (Day 2)
│       ├── Cargo.toml
│       └── src/lib.rs
├── sdk/                               # TypeScript SDK for lenders & builders
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # Main ClaimGuard SDK entrypoint
│       ├── types.ts                   # TypeScript interfaces
│       └── client.ts                  # RPC & contract interaction methods
├── scripts/
│   ├── deploy.ts                      # Deployment script for Portaldot V3
│   ├── demo_flow.ts                   # End-to-end reproducible CLI demo
│   ├── relayer.ts                     # Cross-chain snapshot signer & relayer
│   └── watcher.ts                     # Optimistic assertion watcher bot
├── frontend/                          # React + Tailwind Dashboard (Day 3)
│   ├── package.json
│   ├── src/
│   └── public/
└── docs/
    ├── README.md                      # Full Combined Project Document
    └── Bonded RWA Invariants PRD...md # PRD reference
```

---

## 11. Invariants & Non-Negotiable Rules (DO NOT CHANGE)

1. **Fail-Closed Security:** Any unverified, disputed, or over-limit claim must strictly block pledges and transfers.
2. **Double-Pledge Impossibility:** `pledge()` must check `total_pledged + amount <= max_advance_limit`. If exceeded, it MUST revert with `ExceedsAdvanceRate`.
3. **No Phantom State:** All state modifications must be persisted in contract storage and accompanied by corresponding events.
4. **Honest Limitations:** Always state clearly that the MVP resolver and relayer use trusted signers, with decentralized roadmaps.
5. **No Placeholders in Final Submissions:** Every hash, link, and code snippet must be real and functional.
