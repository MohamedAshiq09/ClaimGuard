# Bonded RWA Invariants PRD: Remaining Sections

Oct 26, 2026 · @qonnect

## User flows and demo script

Three flows prove the product, and the demo script runs them back to back in under 3 minutes. Each flow is one run of the scripted demo (FR-6.1) and prints a tx hash per step.

### Flow A: honest claim to enforced transfer

1. The issuer registers the token in InvariantRegistry and receives an assetId.
2. The issuer adds three invariants: a jurisdiction allowlist, a transfer lock (off), and a RequiredClaim pointing at the October revenue claim.
3. The issuer calls assertClaim with the claim hash and a 5 tPOT bond, using the 10-minute demo window.
4. Nobody challenges. After the window closes, anyone calls finalizeUnchallenged; the claim settles true and the bond is returned.
5. A holder transfers tokens. The token calls canTransfer, the guard returns ok, and the transfer succeeds.
6. The operator calls depositRevenue and releasePayout(claimId); holders pull their share with withdrawRevenue.

### Flow B: lying claim to blocked transfer

1. The operator asserts "October revenue was 1,000" with a bond, but the published document says 600.
2. The scripted watcher sees the hash mismatch and calls challengeClaim with an equal counter-bond and an evidence hash.
3. The resolver calls resolve(claimId, false); the claim settles false.
4. The challenger withdraws the operator's bond (90% to the challenger, 10% resolver fee) plus their own bond back.
5. The guard now returns "claim settled false". A holder transfer reverts with that reason code, releasePayout reverts, and the escrow returns to the operator.

### Flow C: static invariants

1. The issuer tags a holder with a jurisdiction that is not on the allowlist.
2. A transfer to that holder reverts with "jurisdiction not allowed".
3. The issuer sets the transfer lock; every transfer reverts with "locked". Clearing the lock restores transfers.

Edge case to show only if time allows: a challenged claim the resolver never decides becomes Unresolved after the deadline, both bonds are returned, and the guard still treats it as not settled (fail closed).

### 3-minute demo script

| Time | On screen | Narration point |
| --- | --- | --- |
| 0:00-0:20 | Problem slide and architecture diagram | RWA facts are self-reported; lying costs nothing today |
| 0:20-0:50 | Flow A in the terminal, explorer tabs open | Honest claim settles, transfer and payout go through |
| 0:50-1:50 | Flow B in the terminal | A false claim loses its bond and blocks transfer and payout |
| 1:50-2:20 | Flow C | Static rules use the same guard, no new integration |
| 2:20-2:45 | Trust-model page | Resolver is trusted in the MVP; the bond caps what a lie can unlock |
| 2:45-3:00 | Repo and README | Other builders call isClaimSettled or plug in the guard |

## Non-functional requirements and Portaldot V3 constraints

The MVP must be safe to read, cheap to call, and honest about what the chain can and cannot do today. Items marked verify are unconfirmed and are tracked in the assumptions section.

### Non-functional requirements

| Area | Requirement |
| --- | --- |
| Security | Pull-based payouts only; checks-effects-interactions on every state change; reentrancy guard on withdraw and revenue functions |
| Fail-closed behavior | Any claim that is not settled true (Asserted, Challenged, Unresolved, SettledFalse) must block dependent transfers and payouts |
| Gas and weight | canTransfer is a view with a bounded loop (max 8 invariants per asset); one guard call adds a fixed, documented cost to each token transfer |
| Immutability | A settled claim can never change; no upgradeable proxies in the MVP |
| Configuration | Bond size, windows and resolver fee live in configuration, not code constants |
| Observability | Every state transition emits an event with claim id and actor, so a watcher can rebuild state from logs |
| Reproducibility | One command deploys all contracts to the testnet and writes addresses to a file used by the README and demo script |
| Documentation | Trust model states plainly who resolves disputes, what a bond protects and what can still go wrong |

### Portaldot V3 constraints and design responses

| Constraint | Design response |
| --- | --- |
| EVM runs through pallet-revive (spec 3002, chain ID 420420777); behavior may differ from standard EVM | Day-1 smoke test deploys a trivial contract and runs the full call set before any feature work |
| Clock opcodes may revert (verify) | All time reads go through one internal now(); fall back to a keeper-incremented epoch (FR-1.9) |
| Native token decimals differ (14 on Substrate, 18 in EVM; verify) | Bond math uses msg.value only and never hardcodes decimals; confirm on day 1 |
| Storage deposits may apply to contract storage | Minimum bond must exceed the storage deposit a claim creates |
| ink!/WASM on V3 is unverified | Solidity via revive only; no WASM dependency in the core |
| Block explorer and RPC reliability on testnet unknown | Demo script retries and prints tx hashes; keep a recorded run as a fallback |
| Second EVM testnet for cross-chain re-assertion | Treated as stretch; documented as bond-and-resolver trust, not cryptographic verification |

## Test plan and acceptance criteria

The MVP is accepted when every must-ship requirement has a passing test or a verifiable testnet transaction. Tests come in three layers.

### Test layers

| Layer | Scope | Tooling |
| --- | --- | --- |
| Unit | Every external function in ClaimRegistry, InvariantRegistry, Guard and the sample token, including revert paths | Foundry or Hardhat (pick on day 1) |
| Fuzz and invariant | Bond accounting and the guard (properties below) | Foundry invariant tests or equivalent |
| End-to-end | Demo script against the V3 testnet: one tx per state transition | Script from FR-6.1 |

### Properties the fuzz and invariant tests must hold

- Total bonds held by ClaimRegistry plus pending withdrawals always equals the sum of deposits minus withdrawals.
- A settled claim never changes status or outcome.
- Every claim ends in exactly one of SettledTrue, SettledFalse or Unresolved, and the winner or both parties can always withdraw.
- The guard returns ok only if every invariant on the asset passes; an invariant that cannot be evaluated counts as a failure.
- No account can withdraw more than it is owed, and a second withdraw returns zero.
- A RequiredClaim never passes unless isClaimSettled returns (true, true).

### Acceptance criteria

| ID | Criterion | Covers |
| --- | --- | --- |
| AC-1 | An unchallenged claim settles true after its window and the bond is returned | FR-1.3 |
| AC-2 | A challenged claim resolved false pays 90% of the loser's bond to the challenger and 10% to the resolver | FR-1.4, FR-1.5 |
| AC-3 | A challenged claim with no resolution by the deadline becomes Unresolved, returns both bonds and does not pass the guard | FR-1.6 |
| AC-4 | A transfer reverts with the correct reason code for each of: locked, jurisdiction, claim not settled, claim settled false | FR-3.1 to FR-3.3 |
| AC-5 | releasePayout credits holders only after the revenue claim settles true; withdrawRevenue pays each holder their share | FR-4.2, FR-4.3 |
| AC-6 | Adding or removing an invariant emits an event and changes the invariant root | FR-2.4, FR-2.6 |
| AC-7 | The demo script prints a tx hash for assert, challenge, resolve, transfer and payout, and all are visible on the testnet explorer | FR-6.1 |
| AC-8 | All contract addresses are in the README and match the deployed contracts | Targets table |

Stretch items (watcher bot, second-chain re-assertion, timelock) get their own acceptance check only if built; otherwise they are listed in the README as designed, not shipped.

## Risks and mitigations

The biggest threats are chain behavior we have not verified and a nine-day window; the economic and trust risks are documented rather than solved in the MVP.

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| pallet-revive rejects a contract feature or opcode we rely on | Medium | High | Day-1 smoke test of deploy, payable calls, events and time reads before feature work; simplify the contract to fit |
| Clock opcodes revert or behave oddly on V3 | Medium | High | Single internal now() with keeper-incremented epoch fallback (FR-1.9) |
| Testnet RPC or explorer downtime during judging | Medium | High | Recorded demo video, saved tx hashes, retry logic in the script |
| Native token decimals or storage deposit surprise breaks bond math | Medium | Medium | Confirm on day 1; keep bond values in configuration; use msg.value only |
| Scope creep into stretch items | High | Medium | Must-ship list frozen on Oct 26; stretch only after the day-1 checks pass and the core demo runs end to end |
| Resolver is a trusted party, so a bad resolver can settle a claim wrongly | High (by design) | Medium | State it plainly in the trust-model page; named resolver set; describe the multi-resolver and optimistic-dispute upgrade path |
| No challenger watching, so a false claim settles unchallenged | Medium | High | Scripted watcher in the demo; document that security is at most the bond and only if someone watches |
| Bond smaller than the value a lie unlocks | Medium | High | Guidance to size the bond at least to the gated payout; the demo uses a payout below the bond |
| Collusion between asserter and challenger to launder bonds | Low | Low | Resolver fee is only 10% and both bonds are returned on a true outcome; note as a known limit |
| Two-person team loses days to illness or blockers | Medium | High | Split by contract, daily sync, early cut of the C-priority items |
| Originality rules: code must be written mostly in the build window | Low | High | Start the repo fresh on Oct 26 or document pre-window work; commit on at least 7 different days |

## Timeline, milestones and team split

The plan has the core loop working by Nov 3 and holds Nov 4-6 as buffer before the build window closes on Nov 6. The two-builder split below is a proposal; swap in names and adjust.

&#91;embedded content: build plan · 7 work bars, 2 milestones\]

Bars are work and diamonds are milestones. Stretch items (watcher bot, live second-chain re-assertion, timelock) start only after the Nov 3 milestone and only if the core demo runs end to end.

### Team split

| Builder | Owns | Hand-off to the other |
| --- | --- | --- |
| A | ClaimRegistry, bond accounting, fuzz and invariant tests, resolver role | isClaimSettled interface frozen by Oct 28 |
| B | InvariantRegistry, Guard, sample token and payout, trust-model page | Guard interface used by the token by Oct 31 |
| Both | Day-1 chain checks, demo script, README, demo video | Daily 15-minute sync; review each other's code before merge |

Commit on at least 7 different days between Oct 26 and Nov 5 to meet the process target.

## Submission checklist and evaluation mapping

Submit by the Nov 6, 2026 build-window close with everything below ready a day earlier. The official judging criteria were not in the material provided, so the mapping uses common hackathon criteria and must be checked against the DoraHacks page.

### Submission checklist

- [ ] Public GitHub repo with README, architecture diagram and setup instructions
- [ ] Contracts deployed on the Portaldot V3 testnet; addresses listed in the README
- [ ] Tx hashes for every state transition (assert, challenge, resolve, transfer, payout) linked in the README
- [ ] Demo script that reruns the happy path, challenge path and static-invariant path
- [ ] Trust-model page stating who resolves, what a bond protects and what can go wrong
- [ ] Demo video of 3 minutes or less, uploaded and linked
- [ ] Commits on at least 7 different days, no last-day dump
- [ ] DoraHacks submission filled in: primary track Modular Cloud & Middleware, secondary track Ecosystem DApps
- [ ] Test results and fuzz/invariant run output in the repo
- [ ] License file and a note on what was built inside the build window

### Evaluation mapping (assumed criteria)

| Likely criterion | How the project answers it | Evidence to show |
| --- | --- | --- |
| Technical quality | Bonded claims, invariant root and guard, tested with fuzz and invariant tests | Test output, contract code |
| Working demo on the chain | Full loop on the V3 testnet with verifiable transactions | Explorer links, demo video |
| Fit with the track | Middleware that other builders call: one claim registry, one invariant registry, one guard | isClaimSettled and guard interfaces in the README |
| Ecosystem value | Gives RWA projects on Portaldot a shared trust primitive | RWA gap argument in the Problem section |
| Honesty about limits | Trusted resolver, bond-size limits and cross-chain trust assumptions stated plainly | Trust-model page |
| Continuity | Reusable repo and a roadmap the Builder program could support | Post-hackathon roadmap |

## Assumptions to verify and open questions

Seven chain and platform assumptions decide whether the plan holds; each needs a day-1 check with a named fallback.

### Assumptions to verify on day 1

| # | Assumption | How to check | If false |
| --- | --- | --- | --- |
| A1 | Solidity contracts deploy and run on V3 via revive | Deploy a trivial contract, call every function type | Reduce contract features to what runs |
| A2 | Block timestamp opcodes work | Read timestamp in a test contract | Keeper-incremented epoch (FR-1.9) |
| A3 | Payable calls, events and msg.value behave as in EVM | Smoke test bond deposit and withdraw | Adjust bond flow |
| A4 | Native token decimals are 18 in the EVM view (14 on Substrate) | Read a balance and compare | Use msg.value only; set bond in configuration |
| A5 | Storage deposits are small relative to a 5 tPOT bond | Measure deposit for one claim | Raise the minimum bond |
| A6 | Testnet faucet gives enough tPOT for demo runs | Request funds early | Reduce bond for demo |
| A7 | A second EVM testnet is available for the cross-chain stretch | Pick the chain and deploy a stub | Keep cross-chain as design only |

### Open questions

- Who plays the resolver role in the demo and in the README: a named teammate, a multisig or a single address?
- What are the official judging criteria and submission format on DoraHacks?
- Is the bond of 5 tPOT enough for a minimum, once storage deposit is measured?
- Should the watcher bot ship in the MVP or stay a stretch item?
- Is the sample token a new ERC-20 or a wrapper of an existing Hacker House RWA entry?
- Which test framework works against the V3 testnet (Foundry or Hardhat)?
- Does the Builder program have a formal intake that the roadmap should align to?

## Post-hackathon roadmap

After the event the work moves from a trusted resolver and a testnet demo toward a decentralized dispute path and real issuers. Each phase has a gate that must pass before the next begins.

| Phase | Focus | Gate to move on |
| --- | --- | --- |
| 1. Harden (Nov-Dec 2026) | Security review, fix findings, publish the trust model, finish stretch items (watcher bot, timelock, holder cap) | Independent review with no open high-severity findings |
| 2. Decentralize disputes (Q1 2027) | 2-of-3 resolver voting, then a larger named resolver set; evidence format for claims | Resolver set runs at least one live dispute on testnet |
| 3. Cross-chain (Q1-Q2 2027) | Live second-chain re-assertion with RootMirror; explore light-client or bridge-backed verification | One asset's invariant root mirrored and enforced on a second chain |
| 4. Pilot issuers (mid 2027) | Onboard one or two real or realistic RWA issuers; more claim types and invariant types | An issuer runs claims through a full cycle with real bond sizes |
| 5. Mainnet (when gates pass) | Upgradeable-contract policy, audits, bond sizing guidance tied to payout value | Audit complete and resolver governance agreed |

The phase dates are proposals and depend on whether the Builder program or another grant supports the work.
