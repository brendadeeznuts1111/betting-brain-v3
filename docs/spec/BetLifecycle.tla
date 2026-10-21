--------------------------- MODULE BetLifecycle ---------------------------
(***************************************************************************)
(* Abstract model of bet_history ingest (src/schedules/betHistoryIngest.ts) *)
(* and the statechart in docs/bet-lifecycle.md.                             *)
(*                                                                          *)
(* The book settles each wager at most once (no re-grade). The poller may   *)
(* deliver ANY snapshot it has ever seen for a wager: duplicates and stale  *)
(* (out-of-order) PENDING snapshots after settlement are allowed. Each      *)
(* delivery is applied to the store by the upsert under test:               *)
(*   Mode = "ignore"  : INSERT OR IGNORE  (PR #7 head, f941a66)             *)
(*   Mode = "guarded" : ON CONFLICT DO UPDATE ... WHERE result = 'PENDING'  *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS Wagers, Outcomes, Mode, MaxDeliveries

None    == "NONE"
Pending == "PENDING"
States  == {Pending} \cup Outcomes

VARIABLES
    truth,      \* book's current state per wager
    seen,       \* snapshots the poller can (re)deliver per wager
    stored,     \* bet_history.result per wager (None = no row)
    entries,    \* times the stored row entered a terminal state
    fresh,      \* TRUE once a delivery of the book's settled state was applied
    deliveries  \* bound for TLC

vars == <<truth, seen, stored, entries, fresh, deliveries>>

Init ==
    /\ truth = [w \in Wagers |-> Pending]
    /\ seen = [w \in Wagers |-> {Pending}]
    /\ stored = [w \in Wagers |-> None]
    /\ entries = [w \in Wagers |-> 0]
    /\ fresh = [w \in Wagers |-> FALSE]
    /\ deliveries = 0

\* Book grades a wager exactly once.
Settle(w, o) ==
    /\ truth[w] = Pending
    /\ truth' = [truth EXCEPT ![w] = o]
    /\ seen' = [seen EXCEPT ![w] = @ \cup {o}]
    /\ UNCHANGED <<stored, entries, fresh, deliveries>>

Apply(cur, s) ==
    IF cur = None THEN s
    ELSE IF Mode = "ignore" THEN cur
    ELSE IF cur = Pending THEN s           \* guarded upsert
    ELSE cur                               \* terminal is absorbing

\* Poller delivers any snapshot ever observed (duplicate / stale allowed).
Deliver(w, s) ==
    /\ deliveries < MaxDeliveries
    /\ s \in seen[w]
    /\ LET new == Apply(stored[w], s) IN
        /\ stored' = [stored EXCEPT ![w] = new]
        /\ entries' = [entries EXCEPT ![w] =
                         IF new \in Outcomes /\ new # stored[w] THEN @ + 1 ELSE @]
    /\ fresh' = [fresh EXCEPT ![w] = @ \/ (s = truth[w] /\ s \in Outcomes)]
    /\ deliveries' = deliveries + 1
    /\ UNCHANGED <<truth, seen>>

Next ==
    \/ \E w \in Wagers, o \in Outcomes : Settle(w, o)
    \/ \E w \in Wagers, s \in States : Deliver(w, s)

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ stored \in [Wagers -> States \cup {None}]
    /\ truth \in [Wagers -> States]

\* I3: only legal edges of the statechart are ever taken.
NoIllegalTransition ==
    [][\A w \in Wagers :
         stored'[w] # stored[w] =>
            \/ stored[w] = None
            \/ stored[w] = Pending]_vars

\* I1: a row enters a terminal state at most once, and only the true one.
ExactlyOnceTerminal ==
    \A w \in Wagers :
        /\ entries[w] <= 1
        /\ stored[w] \in Outcomes => stored[w] = truth[w]

\* I2: once the settled state has been delivered, the row reflects it.
NoDroppedTransition ==
    \A w \in Wagers : fresh[w] => stored[w] = truth[w]
=============================================================================
