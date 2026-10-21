# TLA+ spec: bet lifecycle

`BetLifecycle.tla` is an abstract model of the bet-history ingest upsert against
the statechart in [`../bet-lifecycle.md`](../bet-lifecycle.md). The poller may
deliver any snapshot it has ever seen for a wager, so it covers duplicates and
stale (out-of-order) `PENDING` snapshots after settlement.

| Config                     | Upsert modelled                                      | TLC result (2 wagers, 6 deliveries)                                                                                               |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `BetLifecycle_ignore.cfg`  | `INSERT OR IGNORE` (PR #7 head `f941a66`)            | **`NoDroppedTransition` violated**: `Settle(w1, LOSS)`, `Deliver(w1, PENDING)` (stale), `Deliver(w1, LOSS)` → row stays `PENDING` |
| `BetLifecycle_guarded.cfg` | `ON CONFLICT DO UPDATE ... WHERE result = 'PENDING'` | No error; 597 distinct states, all invariants + `NoIllegalTransition` hold                                                        |

Run (needs Java 11+ and `tla2tools.jar` from
https://github.com/tlaplus/tlaplus/releases):

```sh
cd docs/spec
java -cp tla2tools.jar tlc2.TLC -config BetLifecycle_guarded.cfg BetLifecycle.tla
java -cp tla2tools.jar tlc2.TLC -config BetLifecycle_ignore.cfg  BetLifecycle.tla   # expected to fail
```

The executable counterpart, run against the real ingest code and SQL in
`bun test`, is `tests/unit/bet-lifecycle-model.test.ts`.
