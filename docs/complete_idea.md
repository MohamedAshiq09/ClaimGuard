# ClaimGuard: Combined Project Document (Lien Registry + Bonded Verification)

> **Tagline:** Compliance and lien state that travels with the asset. Built on Portaldot V3 with ink!  
> **Hackathon:** Portaldot Hacker House 2026 (DoraHacks)  
> **Website:** [Portaldot Hacker House 2026 on DoraHacks](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail)

---

## Hackathon and Context

This project is built for Portaldot Hacker House 2026, listed on [DoraHacks](https://dorahacks.io/hackathon/portaldot-hacker-house-2026/detail). The event is built around Portaldot Network V3.0, a network with dual WASM and EVM execution, modular architecture and a stated focus on multi-chain coordination and real-world assets (RWA).

| Item | Detail |
| :--- | :--- |
| **Hackathon** | Portaldot Hacker House 2026 (DoraHacks) |
| **Network** | Portaldot V3.0 testnet |
| **Primary Track** | Ecosystem DApps (RWA / DeFi) |
| **Secondary Tracks** | Modular Cloud & Middleware; Multi-Chain & Cross-Chain Infra |
| **Language** | Rust with ink! (WASM contracts) & Solidity / Revive EVM |
| **Builder** | Solo |
| **Goal** | Win, with a working testnet demo and a reusable SDK |

**Why the primary track is Ecosystem DApps:** It rewards a working product with a real user (the supplier and the lender), and the invoice-financing demo is the strongest thing you can show. The middleware and cross-chain angles are highlighted as secondary strengths, not the headline.

---

## The Combined Idea

ClaimGuard answers four questions that every lender asks about a receivable, in one unified stack of ink! contracts:

| Layer | Question it answers | Component |
| :--- | :--- | :--- |
| **Lien** | Is this invoice already pledged to someone else? | `LienManager` |
| **Rules** | Is this transfer or pledge allowed right now? | `InvariantEngine` & rule modules |
| **Truth** | Is this invoice real? | `BondedVerification` |
| **Portability** | Can another app or chain trust this state? | Signed snapshot gateway & relayer |

### Where the idea came from
The first version was ClaimGuard alone: a shared lien registry with enforced rules. Its weak spot was "how do you know the invoice is real?" An optimistic bonded attestation approach (post a claim with a deposit, let anyone challenge it during a window, and make liars lose the deposit) fits that gap exactly. Applied to invoices instead of generic data, it stops being a generic oracle and becomes the Truth layer of this product.

**Pitch for the combined version:**  
*One invoice, one lien, backed by a bond. A fake invoice costs the fraudster money, and a real one can be pledged only once, on any chain.*

---

## Solo Build Strategy

1. **Minimum winning demo = Phases 0 to 3:** (register, acknowledge, pledge, blocked double-pledge, SDK, demo lender). Finish this before touching anything else.
2. **The differentiator = the verification module (Phase 4):** It lifts the project from "compliance NFT" to "trust stack". Built after Phase 3 works on testnet.
3. **Cross-chain = relayer-first:** Do not depend on iBridge. If it later proves usable, swap it in; if not, the relayer path is already honest and working.
4. **Deliberately out of scope:** A BEEFY light client (roadmap only), a fully decentralized dispute resolver, real KYC, and real invoice verification against government systems.
5. **Say the limits out loud in the demo:** The resolver is trusted in the MVP, and the relayer is a trusted signer. Judges respect honesty and punish hidden trust.
6. **Cut order if behind:** Dashboard, then cross-chain, then verification. Phases 1 to 3 are never cut.

---

## 1. One-Paragraph Pitch

ClaimGuard is a Portaldot-native infrastructure layer that turns real-world receivables (starting with MSME invoices) into on-chain claims whose rules, called invariants, are enforced by ink! smart contracts and travel with the claim across applications and chains. At its core is a `LienManager`: one shared source of truth that says who has a financing lien on a claim, so the same invoice can never be pledged to two lenders at once. Lenders, DeFi protocols and other builders integrate it through a small TypeScript SDK in about five lines, instead of rebuilding compliance, provenance and double-financing checks from scratch.

- **Tagline:** Compliance that travels with the asset.
- **Demo line:** *"Without ClaimGuard, two lenders fund the same invoice. With ClaimGuard, the second one is rejected on-chain."*

---

## 2. The Problem

### 2.1 The Person with the Problem
Meena runs a small garment-manufacturing unit in Tiruppur, Tamil Nadu. She ships goods worth ₹10,00,000 to a large retailer. The retailer's payment terms are 90 days. Meena has to pay wages, yarn suppliers and electricity now, not in three months. She needs cash against that invoice today.

She goes to lenders. They hesitate for three reasons:
1. **Double financing risk:** Nothing stops the same invoice being pledged to Lender A and Lender B (or on two different platforms). The lender who funds second or third loses money.
2. **Lost context:** When an invoice moves between platforms, details such as buyer acknowledgment, due date, jurisdiction and existing liens are lost or must be re-verified manually.
3. **Slow, repeated verification:** Every lender re-checks everything from zero, which adds cost, delay and a higher interest rate.

The result: honest suppliers like Meena pay high interest or get no credit at all.

### 2.2 The Lender's Side
A lender (NBFC, fintech or DeFi pool) wants to fund invoices but cannot cheaply answer: *Is this invoice real? Is it already pledged? Is the buyer confirmed? Is it within my allowed jurisdiction? Is the advance rate safe?* Fraud and verification costs get priced into every loan.

### 2.3 The Ecosystem-Level Problem
Portaldot's thesis highlights two issues: value silos between chains and apps, and the difficulty of keeping real-world assets connected to reality once tokenized. Existing bridges move tokens. They do not move the meaning and rules attached to those tokens. Every dApp ends up re-implementing compliance and provenance, or dropping it.

### 2.4 Real-World Context
Receivables financing is a large, real market. India has government-backed invoice discounting platforms (TReDS, such as RXIL, M1xchange and Invoicemart), but they are centralized, limited to certain participants, and do not interoperate with open on-chain finance. Double financing is a known fraud pattern in trade finance worldwide. Tokenized RWAs elsewhere (ERC-3643 / T-REX, ERC-1400) handle who may hold a token, but do not provide a cross-application, cross-chain shared lien registry for a specific claim.

---

## 3. The Solution

ClaimGuard has three core ideas:
1. **Claim:** An invoice is registered on-chain as a claim, represented by a PSP34 token, with its key facts (amount, due date, buyer, provenance hash).
2. **Invariants:** Non-negotiable rules are attached to the claim and enforced by contract code on every transfer or pledge: jurisdiction allowlist, buyer acknowledgment, transfer lock, maximum advance rate, maturity check, bonded verification status.
3. **Shared Lien State:** A single `LienManager` records every lien on a claim. A second pledge on a fully-pledged claim reverts. Any dApp, on Portaldot or another chain, can query the status.

What makes it different: it does not just move a token. It coordinates the state and rules attached to the token so the next application inherits trust instead of starting from zero.

---

## 4. Who Benefits (Users and Stakeholders)

| Stakeholder | Pain Today | What ClaimGuard Gives Them |
| :--- | :--- | :--- |
| **MSME Supplier (Issuer)** | Waits 60 to 90 days, expensive credit | Faster, cheaper funding because lenders trust the claim |
| **Lender / NBFC / Fintech** | Double-financing fraud, repeated verification | One-call lien check, enforced rules |
| **DeFi Lending Protocol** | Cannot safely accept RWA collateral | Plug-in collateral safety via SDK |
| **Buyer (Large Corporate)** | Confusion about who to pay | Acknowledgment recorded, clear holder of the claim |
| **Auditor / Regulator** | Hard to trace history | Immutable provenance and violation log |
| **Other Portaldot Builders** | Must write compliance logic themselves | Reusable contracts and SDK |

---

## 5. Real-World Scenarios

### Scenario A: Double-pledge attempt (The flagship demo)
1. Meena registers invoice `INV-1042` (₹10,00,000, due in 90 days, buyer: a retailer).
2. The buyer acknowledges it on-chain. The claim is marked `Acknowledged`.
3. Meena pledges it to Lender A for an 80% advance (₹8,00,000). Lien recorded.
4. Meena (or a fraudster) tries to pledge the same invoice to Lender B.
5. The contract rejects it: the claim is already pledged to its maximum advance rate.
6. Lender B, checking from another app or chain, sees "pledged to Lender A" with no manual verification.

### Scenario B: Non-compliant transfer
A claim is restricted to buyers in a certain jurisdiction. Someone tries to transfer it to a wallet that is not on the allowlist. The transfer reverts and the attempt is logged as an invariant violation on the dashboard.

### Scenario C: Partial pledge
The maximum advance rate is 80%. Lender A takes 50%, Lender C takes 30%. A third lender asking for 20% more is rejected because it would exceed 80%.

### Scenario D: Maturity and release
The buyer pays on the due date. The lien is released, the claim is settled, and its history stays on-chain. A claim past maturity cannot be newly pledged.

### Scenario E: Cross-chain lender
A lender on another chain wants to fund Meena's invoice. It queries ClaimGuard's gateway, gets a signed snapshot of the claim's invariants and lien status, and decides without re-verifying from scratch.

### Scenario F: The fake invoice (Bonded Verification)
Ravi registers an invoice from a buyer that never ordered anything and posts a bond asserting it is genuine. The real buyer sees it, posts a matching bond and challenges within the window. The resolver checks the evidence and rules it fake. Ravi loses his bond to the buyer, the claim is marked `Rejected`, and no lender can pledge it. If nobody had challenged, a genuine invoice would become `Verified` and the bond would return.

---

## 6. System Architecture

### 6.1 Overview
```text
Supplier / Issuer ──► ClaimRegistry ──► ClaimToken (PSP34)
                            │                   │ (transfer hook)
                            ▼                   ▼
                      InvariantEngine  ◄── Rule Modules
                            │
                            ▼
                       LienManager     ◄── Lender dApps (via SDK)
                            │
                            ▼
                    CrossChainGateway  ──► Other chains / dApps
                            │
                            ▼
                  Dashboard + Event Indexer
```

### 6.2 Smart Contracts (ink!)
1. **ClaimRegistry:** Registers claims: issuer, amount, currency, due date, buyer address, provenance hash (hash of off-chain invoice document), status (`Registered`, `Acknowledged`, `Pledged`, `Settled`, `Defaulted`, `Cancelled`).
2. **ClaimToken (PSP34):** Each claim is a PSP34 token. Transfer calls `InvariantEngine` before moving.
3. **InvariantEngine:** Holds the list of rule modules attached to each claim. Evaluates `check(claim_id, action, actor, params)`.
4. **Rule Modules:**
   - `JurisdictionAllowlist`: Only approved regions/wallets may hold/receive.
   - `BuyerAcknowledged`: Claim cannot be pledged until buyer confirms invoice.
   - `TransferLock`: Claim is frozen while pledged.
   - `MaxAdvanceRate`: Total pledged amount cannot exceed a percentage of face value.
   - `MaturityCheck`: No new pledges after the due date.
   - `VerifiedOnly`: Requires `Verified` status from BondedVerification.
5. **LienManager (The Core):**
   - Records each lien: claim, lender, amount, timestamp, status.
   - Maintains total pledged amount per claim.
   - Rejects any lien that violates invariants or exceeds advance rate.
   - Supports release (repayment) and enforcement (default).
6. **CrossChainGateway:** Exports signed claim-state snapshot (invariants, status, total lien amount, lenders, nonce, expiry). A destination-side verifier checks signature and re-asserts state.
7. **Demo LendingPool:** Sample lender dApp that accepts ClaimGuard claims as collateral via SDK.

### 6.3 Off-Chain Components
- **Metadata Store:** Invoice PDF lives off-chain (IPFS or simple storage). On-chain hash validates provenance.
- **Event Indexer:** Reads contract events and serves a clean API for the dashboard.
- **Relayer:** Signs and posts snapshots cross-chain.
- **Watcher Script:** Node.js process listening for new assertions and flagging suspicious claims.

### 6.4 SDK (TypeScript)
```typescript
const cg = new ClaimGuard(provider, addresses);
await cg.registerClaim({ amount, dueDate, buyer, docHash });
await cg.checkInvariants(claimId, "pledge", lender, amount);
await cg.pledge(claimId, lender, amount);
const status = await cg.getLienStatus(claimId);
```
Enables integration in roughly 5 lines of code.

### 6.5 Bonded Verification Module (The Truth Layer)
| Function | Who calls it | What it does |
| :--- | :--- | :--- |
| `assert_valid(claim_id, evidence_hash)` | Issuer (payable) | Posts bond and asserts invoice is genuine; starts challenge window |
| `challenge(claim_id, reason_hash)` | Buyer, lender, anyone (payable) | Posts matching bond and disputes assertion |
| `resolve(claim_id, outcome)` | Resolver only | Decides winner; loser's bond goes to winner |
| `finalize(claim_id)` | Anyone | If window ends with no challenge, marks claim `Verified` and returns bond |
| `is_verified(claim_id)` | Any contract (read-only) | Returns verification state |

- Verification states: `Unverified`, `Asserted`, `Disputed`, `Verified`, `Rejected`.

### 6.6 Trust Model (Honest Disclosures)
- **Resolver is trusted in the MVP:** Simplest honest implementation. Roadmap: multisig, UMA / optimistic oracle integration.
- **Challenger vigilance:** If nobody challenges, a fake invoice could slip through. Mitigated by buyer incentive, watcher bot, and proportional bonds.
- **Relayer trust:** The relayer is a trusted signer for cross-chain snapshots in MVP.

---

## 7. Core Flows
1. **Register a Claim:** Issuer submits details and document hash; ClaimToken minted; rules attached.
2. **Buyer Acknowledgment:** Buyer calls `acknowledge(claim_id)`. `BuyerAcknowledged` rule passes.
3. **Pledge to Lender:** Lender/issuer calls `pledge(claim_id, lender, amount)`. `LienManager` validates invariants, records lien, locks transfers.
4. **Release / Settle:** On repayment, lien is released; claim marked `Settled`.
5. **Cross-Chain Query:** Gateway signs snapshot; destination verifier checks signature, nonce, and expiry.

---

## 8. Technology Stack
- **Smart Contracts:** Rust, ink! (WASM) / pallet-revive on Portaldot V3 testnet
- **Token Standard:** PSP34 / ERC-721 equivalent
- **Testing:** ink! unit tests + integration tests
- **SDK:** TypeScript with `@polkadot/api` / contract API & ethers.js
- **Frontend:** React + Tailwind CSS
- **Indexer & Watcher:** Node.js event listener

---

## 9. Build Plan & Demo Moments
- **Stage 1 (Claims Core):** `ClaimRegistry`, `ClaimToken`, jurisdiction & transfer lock.
- **Stage 2 (Lien Core):** `LienManager`, `BuyerAcknowledged`, `MaxAdvanceRate` -> **Blocked double-pledge demo moment.**
- **Stage 3 (SDK & Lender):** TypeScript SDK, demo `LendingPool` -> **5-line lender integration.**
- **Stage 4 (Verification Module):** `BondedVerification` contract & watcher -> **Fake invoice challenge demo.**
- **Stage 5 (Cross-Chain Snapshot):** Snapshot signing, relayer, destination verifier.
- **Stage 6 (Dashboard & Polish):** React UI with live status, liens, and blocked fraud feed.

---

## 10. DoraHacks Hackathon Alignment
- **Primary Track:** Ecosystem DApps (RWA / DeFi)
- **Secondary Tracks:** Modular Cloud & Middleware; Multi-Chain & Cross-Chain Infra
- **Submission Requirements:** Public GitHub repo, complete README, demo video (<3 min), pitch deck (6-8 slides), verified testnet contract addresses and transaction hashes.
