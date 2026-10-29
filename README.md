<div align="center">

# 🛡️ ClaimGuard
### *Compliance and lien state that travels with the asset.*

[![Portaldot V3](https://img.shields.io/badge/Network-Portaldot%20V3%20Testnet-blue.svg)](https://node-console.portaldot.dev/)
[![ink!](https://img.shields.io/badge/Smart%20Contracts-ink!%20v5.1.1-red.svg)](https://use.ink/)
[![pallet-contracts](https://img.shields.io/badge/Execution-Substrate%20WASM%20Contracts-green.svg)](https://use.ink/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Portaldot%20Hacker%20House%202026-orange.svg)](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)
[![Track](https://img.shields.io/badge/Track-Ecosystem%20DApps%20(RWA%2FDeFi)-purple.svg)](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

<br/>

> **The North Star:**  
> *"Without ClaimGuard, two lenders fund the same invoice. With ClaimGuard, the second pledge reverts on-chain."*

</div>

---

## 📌 Executive Summary

**ClaimGuard** is a Portaldot-native decentralized trust and compliance infrastructure that turns real-world receivables (starting with MSME invoices) into on-chain claims whose rules—called **invariants**—are strictly enforced by ink! smart contracts and travel with the claim across applications and chains.

At its core is the **LienManager**: a shared, single source of truth that tracks who holds financing liens on any tokenized asset. The moment an invoice is pledged up to its maximum advance rate, any duplicate pledge attempt—even from another protocol or chain—**reverts on-chain with zero state mutation**.

Lenders, DeFi protocols, and fintech platforms integrate ClaimGuard in **under five lines of TypeScript**, eliminating double-financing fraud and manual verification costs.

---

## 🛑 The Real-World Problem

### Meena's Dilemma
Meena runs an apparel manufacturing unit in Tiruppur, India. She delivers ₹10,00,000 worth of garments to a large retail chain. The retailer's payment terms are **90 days**. 

Meena cannot wait three months: she has payroll, raw yarn suppliers, and electricity bills due this week. She applies for invoice discounting (receivables financing).

Lenders hesitate or quote predatory rates because of three fundamental flaws in trade finance today:

1. **Double-Financing Fraud:** Nothing stops an unscrupulous borrower from submitting the same invoice PDF to Lender A, Lender B, and a DeFi liquidity pool simultaneously. The second and third lenders lose 100% of their capital.
2. **Context Fragmentation:** When an invoice is tokenized or bridged between ecosystems, crucial context (buyer acknowledgment, due date, jurisdictional restrictions, active liens) is lost.
3. **Repeated, Costly Verification:** Every lender starts from scratch, conducting manual diligence. This overhead is passed down to honest MSMEs like Meena as high interest rates or credit denial.

---

## 💡 The ClaimGuard Solution: A 4-Layer Trust Stack

ClaimGuard solves this by answering the four critical questions every lender asks about a receivable in a unified, modular smart contract stack on **Portaldot Network V3.0**:

| Layer | Question Answered | Responsible Component |
| :--- | :--- | :--- |
| **1. Lien** | *Is this invoice already pledged to someone else?* | `LienManager` (Shared On-Chain Registry) |
| **2. Rules** | *Is this transfer or pledge legally permitted right now?* | `InvariantEngine` & 7 Rule Modules |
| **3. Truth** | *Is this invoice genuine, or fabricated paper?* | `BondedVerification` (Optimistic Truth Layer) |
| **4. Portability** | *Can an external dApp or another chain verify this state?* | `CrossChainGateway` & Signed Snapshots |

---

## 🏛️ System Architecture

```text
 MSME Supplier (Meena)
        │
        │ 1. register_claim(face_value, due_date, doc_hash, advance_rate)
        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ClaimGuard Protocol (Portaldot Network V3 / substrate-contracts-node)           │
│                                                                                 │
│   ┌─────────────────────┐                          ┌────────────────────────┐   │
│   │    ClaimRegistry    │                          │     InvariantEngine    │   │
│   │  (Storage & State)  │                          │  (7 Rule Verification) │   │
│   └──────────┬──────────┘                          └───────────┬────────────┘   │
│              │                                                 │                │
│              ▼                                                 ▼                │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                              LienManager                                │   │
│   │                (Single Shared Source of Truth on Liens)                 │   │
│   └──────────┬──────────────────────────────────────────────────────────────┘   │
│              │                                                 ▲                │
│              │                                                 │                │
│              ▼                                                 │                │
│   ┌─────────────────────┐                          ┌───────────┴────────────┐   │
│   │ BondedVerification  │                          │    ClaimGuard SDK      │   │
│   │ (Truth & Staking)   │                          │  (Lenders / Borrowers) │   │
│   └──────────┬──────────┘                          └────────────────────────┘   │
│              │                                                 │                │
│              ▼                                                 ▼                │
│   ┌─────────────────────┐                          ┌────────────────────────┐   │
│   │  CrossChainGateway  │─────────────────────────►│   Lender B Verifier    │   │
│   │  (Signed Snapshots) │                          │(External Chains / DeFi)│   │
│   └─────────────────────┘                          └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ The 7 Invariant Rules

Every interaction (registration, acknowledgment, transfer, and pledge) is checked against non-negotiable on-chain invariants:

1. **`ValidDocHash` (Anti-Duplicate Guard):** Rejects any claim whose document hash already exists in storage. The exact same invoice document cannot be registered under a new ID.
2. **`BuyerAcknowledged`:** A claim cannot be pledged until the buyer explicitly calls `acknowledge()` on-chain, legally validating the obligation.
3. **`MaxAdvanceRate` (Double-Pledge Prevention):** Total active liens cannot exceed `face_value * max_advance_rate_bps / 10,000` (e.g., 80%). Any pledge exceeding this reverts immediately with `Error::ExceedsAdvanceRate`.
4. **`MaturityCheck`:** Prevents new pledges if the invoice has passed its maturity `due_date`.
5. **`TransferLock`:** Freezes claim ownership transfers while active liens exist (`total_pledged > 0`).
6. **`JurisdictionAllowlist`:** Restricts claim transfers to verified wallets matching the permitted jurisdiction ISO country code (e.g., `IN` for India).
7. **`VerifiedOnly` (Truth Layer Coupling):** Claims with unverified or `Rejected` verification status are strictly blocked from receiving financing when `require_verified == true`.

---

## 💰 Bonded Verification (The Truth Layer)

Smart contracts cannot independently inspect off-chain delivery notes or physical cargo. ClaimGuard solves the **Oracle Problem** using **Optimistic Bonded Attestation**:

1. **Assertion:** The issuer calls `assert_valid(claim_id, validity_window, bond)` and deposits a native token bond. A challenge window opens.
2. **Challenge Window:** Anyone (buyer, lender, or watcher bot) can dispute a fraudulent invoice within the window by posting a matching counter-bond.
3. **Resolution:**
   - **No Challenge:** The claim automatically finalizes to `Verified`, and the issuer receives their bond back.
   - **Challenged as Fraud:** If ruled fake by the dispute resolver, the fraudster's bond is **slashed** (90% awarded to the challenger, 10% resolver fee). The invoice is marked `Rejected` and frozen forever.

---

## ⚡ 5-Line TypeScript SDK

DeFi lending pools and fintech backends integrate ClaimGuard in approximately 5 lines of TypeScript:

```typescript
import { ClaimGuard } from "@claimguard/sdk";

const guard = new ClaimGuard({ rpcUrl, contractAddress, signerUri });
await guard.init();

// 1. Dry-run simulation checks all 7 invariants before loan disbursement
const check = await guard.checkInvariants(claimId, "pledge", lenderAddress, loanAmount);
if (!check.allowed) {
  throw new Error(`Pledge rejected: ${check.violatedRule} - ${check.reason}`);
}

// 2. Register lien on-chain (guaranteed zero double-pledge risk)
const { txHash, lienId } = await guard.pledge(claimId, lenderAddress, loanAmount);
console.log(`Lien #${lienId} recorded! Tx: ${txHash}`);
```

---

## 🌐 Cross-Chain Signed Snapshot Protocol (Lender B Defense)

How does a lender on a secondary chain or EVM pool know Meena's invoice wasn't already pledged on Portaldot?

1. **Authoritative Export:** The core contract exports a cryptographic state snapshot with `{ claim_id, status, verification, total_pledged, nonce, expiry }`.
2. **Relayer Signature:** The Relayer service signs the canonical snapshot hash using an authorized keypair (`scripts/relayer.mjs`).
3. **Lender B Verification:** The destination protocol (`scripts/lender_b_verifier.mjs`) independently verifies:
   - Cryptographic signature validity
   - Freshness (`now <= expiry`)
   - Replay protection (`nonce > lastSeenNonce`)
   - Advance capacity: `remaining_capacity = (face_value * advance_rate) - total_pledged`
4. **Rejection of Double-Pledges:** If `remaining_capacity == 0`, Lender B immediately rejects the loan:  
   `"DOUBLE-PLEDGE BLOCKED: Asset already pledged on Portaldot V3!"`

---

## 🧪 Smart Contract Verification & Testing

The core contract (`contracts/claimguard_core`) is written in **ink! v5.1.1** with release profile optimizations (`opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`).

### 11 / 11 Passing Unit & Attack Tests
```bash
cargo test --manifest-path contracts/claimguard_core/Cargo.toml
```
```text
running 11 tests
test claimguard_core::tests::test_register_and_acknowledge ... ok
test claimguard_core::tests::test_double_pledge_rejected ... ok
test claimguard_core::tests::test_split_pledge_and_release ... ok
test claimguard_core::tests::test_maturity_and_jurisdiction ... ok
test claimguard_core::tests::test_unauthorized_callers ... ok
test claimguard_core::tests::test_transfer_and_subsequent_pledge ... ok
test claimguard_core::tests::test_disallowed_jurisdiction_transfer ... ok
test claimguard_core::tests::test_verified_only_enforcement ... ok
test claimguard_core::tests::test_bonded_verification_fake_invoice_slashed ... ok
test claimguard_core::tests::test_bonded_verification_valid_invoice_cleared ... ok
test claimguard_core::tests::test_export_snapshot_and_validation ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; finished in 0.01s
```

---

## 🚀 Running the End-to-End Demo

### 1. Run the Full Flow on Local Contracts Node
```bash
# In terminal 1 (starts local contracts node):
substrate-contracts-node --dev --tmp

# In terminal 2:
node scripts/demo_flow.mjs --target local
```

### 2. Run Cross-Chain Relayer & Lender B Verification
```bash
# Relayer exports & signs snapshot
node scripts/relayer.mjs

# Lender B verifies and blocks cross-chain double pledge
node scripts/lender_b_verifier.mjs
```

### 3. Launch the Dashboard
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## 🏛️ Deployment & Network Registry

| Environment / Target | Address / Hash | Status |
| :--- | :--- | :--- |
| **Testnet: Flipper (Pre-flight)** | `5Ef9UzUx2uqJvZBQkpKxAjwF5aif3sbiN3WB4E7XEmZUjqJX` | Block: `0xd15a10480e97302ccdb017681bea249f33c8c2360ffc18732c3d6bba7c2ab265` |
| **Local: ClaimGuard Core (All-in-One)** | `5CtQP8YggGkhXDgzTZoruymiE1Pjm5zqFMnW5TVSvqyDkqRp` | `substrate-contracts-node` (v0.42.0) — Verified |
| **Testnet: ClaimGuard Core** | Pending Top-up (`scripts/deploy_core.mjs`) | Size: 27.56 KB Wasm bundle (~1,654 tPOT deposit) |

---

## ⚖️ Honest Trust Model & Limitations

1. **Dispute Resolver:** In the MVP, dispute resolution is handled by an authorized resolver key. Roadmap: Transition to a 2-of-3 multi-sig committee, followed by UMA / Kleros optimistic oracles.
2. **Relayer Service:** In the MVP, snapshot relaying uses a trusted Relayer signature key. Roadmap: Trustless BEEFY light-client proofs on destination chains.
3. **Challenger Incentives:** Optimistic challenges require off-chain watcher bots or buyer vigilance, financially backed by 90% bond bounties upon successful fraud disputes.

---

## 🗺️ Post-Hackathon Roadmap

- **Phase 1: Decentralized Dispute Resolution (Q1 2027)**: Multi-sig and optimistic oracle integration.
- **Phase 2: BEEFY Light Client Relay (Q2 2027)**: Cryptographic state proofs verified on EVM chains.
- **Phase 3: Expanded Asset Types (mid 2027)**: Pluggable invariant modules for Warehouse Receipts, Purchase Orders, and Gold-backed claims.
- **Phase 4: Institutional Pilot**: Indian TReDS platform or NBFC trade-finance pilot.

---

## 📄 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
