<div align="center">

# 🛡️ ClaimGuard
### *Compliance and lien state that travels with the asset.*

[![Portaldot V3](https://img.shields.io/badge/Network-Portaldot%20V3%20Testnet-blue.svg)](https://node-console.portaldot.dev/)
[![ink!](https://img.shields.io/badge/Smart%20Contracts-ink!%20v5.1.1-red.svg)](https://use.ink/)
[![pallet-revive](https://img.shields.io/badge/Execution-Dual%20WASM%20%2B%20EVM-green.svg)](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)
[![Hackathon](https://img.shields.io/badge/Hackathon-Portaldot%20Hacker%20House%202026-orange.svg)](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)
[![Track](https://img.shields.io/badge/Track-Ecosystem%20DApps%20(RWA%2FDeFi)-purple.svg)](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

<br/>

> **Demo Line:**  
> *"Without ClaimGuard, two lenders fund the same invoice. With ClaimGuard, the second pledge is rejected on-chain."*

</div>

---

## 📌 Executive Summary

**ClaimGuard** is a Portaldot-native decentralized trust and compliance infrastructure that turns real-world receivables (starting with MSME invoices) into on-chain claims whose rules—called **invariants**—are strictly enforced by ink! smart contracts and travel with the claim across applications and chains.

At its core is the **LienManager**: a shared, single source of truth that tracks who holds financing liens on any tokenized asset. The moment an invoice is pledged up to its maximum advance rate, any duplicate pledge attempt—even from another protocol or chain—**reverts on-chain**.

Lenders, DeFi protocols, and fintech platforms integrate ClaimGuard in **under five lines of TypeScript**, eliminating double-financing fraud and manual verification costs.

---

## 🛑 The Real-World Problem

### Meena's Dilemma
Meena runs an apparel manufacturing unit in Tiruppur, India. She delivers ₹10,00,000 worth of garments to a large retail chain. The retailer's payment terms are **90 days**. 

Meena cannot wait three months: she has payroll, raw yarn suppliers, and electricity bills due this week. She applies for invoice discounting (receivables financing).

Lenders hesitate or quote predatory rates because of three fundamental flaws in trade finance today:

1. **Double-Financing Fraud:** Nothing stops an unscrupulous borrower or fraudster from submitting the same invoice PDF to Lender A, Lender B, and a DeFi liquidity pool simultaneously. The second and third lenders lose 100% of their capital.
2. **Context Fragmentation:** When an invoice is tokenized or bridged between ecosystems, crucial context (buyer acknowledgment, due date, jurisdictional restrictions, active liens) is lost.
3. **Repeated, Costly Verification:** Every lender starts from scratch, conducting manual diligence. This overhead is passed down to honest MSMEs like Meena as high interest rates or credit denial.

---

## 💡 The ClaimGuard Solution: A 4-Layer Trust Stack

ClaimGuard solves this by answering the four critical questions every lender asks about a receivable in a unified, modular smart contract stack on **Portaldot Network V3.0**:

| Layer | Question Answered | Responsible Component |
| :--- | :--- | :--- |
| **1. Lien** | *Is this invoice already pledged to someone else?* | `LienManager` |
| **2. Rules** | *Is this transfer or pledge legally permitted right now?* | `InvariantEngine` & Rule Modules |
| **3. Truth** | *Is this invoice genuine, or fabricated paper?* | `BondedVerification` (Truth Layer) |
| **4. Portability** | *Can an external dApp or another chain verify this state?* | `CrossChainGateway` & Signed Snapshots |

---

## 🏛️ System Architecture

```text
 Supplier / Issuer (Meena)
        │
        │ 1. register_claim(face_value, due_date, doc_hash, advance_rate)
        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ClaimGuard Protocol (Portaldot Network V3)                                      │
│                                                                                 │
│   ┌─────────────────────┐       (ownership)      ┌──────────────────────────┐   │
│   │    ClaimRegistry    │◄──────────────────────►│    ClaimToken (PSP34)    │   │
│   │  (Storage & State)  │                        │ (Enforces Transfer Lock) │   │
│   └──────────┬──────────┘                        └──────────────────────────┘   │
│              │                                                 │                │
│              ▼                                                 ▼                │
│   ┌─────────────────────┐                        ┌──────────────────────────┐   │
│   │   InvariantEngine   │◄───────────────────────┤      7 Rule Modules      │   │
│   │ (Validates Invars)  │                        │  (BuyerAck, MaxRate...)  │   │
│   └──────────┬──────────┘                        └──────────────────────────┘   │
│              │                                                 ▲                │
│              ▼                                                 │                │
│   ┌─────────────────────┐                                      │                │
│   │     LienManager     │◄─── Lender dApps / DeFi Pools ───────┘                │
│   │ (Single Lien Truth) │     (via ClaimGuard SDK)                              │
│   └──────────┬──────────┘                                                       │
│              │                                                                  │
│              ▼                                                                  │
│   ┌─────────────────────┐                        ┌──────────────────────────┐   │
│   │  CrossChainGateway  │───────────────────────►│  Destination Verifier    │   │
│   │  (Signed Snapshots) │                        │ (External Chains/dApps)  │   │
│   └─────────────────────┘                        └──────────────────────────┘   │
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
6. **`JurisdictionAllowlist`:** Restricts claim transfers to verified wallets matching the permitted jurisdiction ISO country code.
7. **`VerifiedOnly` (Truth Layer Coupling):** Claims with disputed or `Rejected` verification status are permanently blocked from receiving financing.

---

## 💰 Bonded Verification (The Truth Layer)

Smart contracts cannot independently inspect off-chain delivery notes or physical cargo. ClaimGuard solves the **Oracle Problem** using **Optimistic Bonded Attestation**:

1. **Assertion:** The issuer calls `assert_valid(claim_id, evidence_hash)` and deposits a native token bond (e.g., 2–5% of face value). A challenge window opens.
2. **Challenge Window:** Anyone (buyer, lender, or watcher bot) can dispute a fraudulent invoice within the window by posting a matching counter-bond.
3. **Resolution:**
   - **No Challenge:** The claim automatically finalizes to `Verified`, and the issuer receives their bond back.
   - **Challenged as Fraud:** If ruled fake by the dispute resolver, the fraudster's bond is **slashed** (90% awarded to the challenger, 10% resolver fee). The invoice is marked `Rejected` and frozen forever.

> **Honest Trust Model Disclosure:** In the MVP, dispute resolution is handled by an authorized resolver key. The post-hackathon roadmap decentralizes this through a multi-sig committee and an optimistic oracle (such as UMA/Kleros).

---

## ⚡ 5-Line TypeScript SDK

DeFi lending pools and fintech backends can integrate ClaimGuard in roughly 5 lines of TypeScript:

```typescript
import { ClaimGuard } from "@claimguard/sdk";

const cg = new ClaimGuard({ rpcUrl, contractAddress, privateKey });

// 1. Check invariants before disbursing loan capital
const check = await cg.checkInvariants(claimId, "pledge", lenderAddress, loanAmount);
if (!check.allowed) {
  throw new Error(`Pledge rejected: ${check.violatedRule} - ${check.reason}`);
}

// 2. Register lien on-chain
const { txHash, lienId } = await cg.pledge(claimId, lenderAddress, loanAmount);
console.log(`Lien #${lienId} enforced on Portaldot V3! Tx: ${txHash}`);
```

---

## 🧪 Smart Contract Verification & Testing

The core contract (`contracts/claimguard_core`) is written in **ink! v5.1.1** with strict zero-warning arithmetic checks (`-D clippy::arithmetic-side-effects`).

### Passing Unit & Invariant Tests
```bash
cargo test --manifest-path contracts/claimguard_core/Cargo.toml
```
```text
running 4 tests
test claimguard_core::tests::test_maturity_and_jurisdiction ... ok
test claimguard_core::tests::test_register_and_acknowledge ... ok
test claimguard_core::tests::test_double_pledge_rejected ... ok
test claimguard_core::tests::test_split_pledge_and_release ... ok

test result: ok. 4 passed; 0 failed; 0 ignored
```

### Production WASM Artifacts
```bash
cargo contract build --manifest-path contracts/claimguard_core/Cargo.toml
```
Artifacts compiled to `target/ink/claimguard_core/`:
- `claimguard_core.contract` (Bundled metadata + bytecode)
- `claimguard_core.wasm` (29.7 KB optimized WASM)
- `claimguard_core.json` (Contract ABI)

---

## 🌐 Portaldot V3 Testnet Configuration

| Environment Parameter | Value |
| :--- | :--- |
| **Network** | Portaldot V3 Testnet |
| **Spec Version** | `3002` (`pallet-revive`) |
| **Substrate JSON-RPC (HTTP)** | `https://test-node-v3.portaldot.dev` |
| **Substrate WebSocket** | `wss://test-node-v3.portaldot.dev` |
| **EVM RPC Endpoint** | `https://test-evm-rpc-v3.portaldot.dev` |
| **EVM Chain ID** | `420420777` (`0x190f1ca9`) |
| **Block Explorer** | [https://node-console.portaldot.dev/](https://node-console.portaldot.dev/) |

---

## 📂 Repository Guide

* [anchor.md](file:///home/ash09/personal-projects/ClaimGuard/anchor.md) — The **Single Source of Truth** for the entire codebase (data models, specifications, demo script, and non-negotiable rules).
* [docs/complete_idea.md](file:///home/ash09/personal-projects/ClaimGuard/docs/complete_idea.md) — The comprehensive initial combined project document and full business pitch.
* [docs/Bonded RWA Invariants PRD Remaining Sections.md](file:///home/ash09/personal-projects/ClaimGuard/docs/Bonded%20RWA%20Invariants%20PRD%20Remaining%20Sections.md) — PRD notes covering non-functional requirements and flows.
* [contracts/claimguard_core/](file:///home/ash09/personal-projects/ClaimGuard/contracts/claimguard_core/) — The primary ink! contract crate.
* [sdk/](file:///home/ash09/personal-projects/ClaimGuard/sdk/) — The TypeScript SDK for external protocols.

---

## 🗺️ Post-Hackathon Roadmap

- **Phase 1: Decentralized Dispute Resolution (Q1 2027)**: Transition the single resolver to a 2-of-3 multi-sig committee, followed by UMA / optimistic dispute protocols.
- **Phase 2: BEEFY Light Client Relay (Q2 2027)**: Replace trusted snapshot signers with cryptographic BEEFY state proofs verified on EVM chains.
- **Phase 3: Expanded Asset Types (mid 2027)**: Launch pluggable invariant modules for Warehouse Receipts, Purchase Orders, and Gold-backed claims.
- **Phase 4: Institutional Pilot**: Pilot with an Indian TReDS platform or NBFC trade-finance desk.

---

## ⚖️ License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
