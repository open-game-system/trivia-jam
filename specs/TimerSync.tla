---- MODULE TimerSync ----
EXTENDS Integers, FiniteSets, TLC

\*---------------------------------------------------------------------
\* Model the timer synchronization between server (Durable Object),
\* host client, player clients, and spectator clients in trivia-jam.
\*
\* FIXED DESIGN: Per-socket send serialization ensures every state
\* update is delivered to every client in order. StartQuestion is
\* guarded until all clients have received the previous update.
\*---------------------------------------------------------------------

CONSTANTS
    Players,          \* Set of player IDs, e.g. {p1, p2}
    MaxClockSkew,     \* Max ticks a client clock can differ from server
    TimerDuration     \* Server timer duration in ticks

\* Variables
VARIABLES
    serverTick,       \* Server's logical clock (ground truth)
    serverState,      \* "idle" | "questionActive" | "questionPrep"
    timerStartTick,   \* Server tick when timer started (-1 = no timer)
    playerAnswered,   \* Function: Players -> BOOLEAN
    clientClockSkew,  \* Function: (Players \union {"host"}) -> Int (offset from server)
    clientView,       \* Function: (Players \union {"host"}) -> "timer" | "synced"
    pendingUpdate     \* Function: (Players \union {"host"}) -> BOOLEAN (per-socket queue)

vars == <<serverTick, serverState, timerStartTick, playerAnswered,
          clientClockSkew, clientView, pendingUpdate>>

Clients == Players \union {"host"}

\*---------------------------------------------------------------------
\* Helpers
\*---------------------------------------------------------------------

\* Server timer has expired
ServerTimerExpired ==
    /\ timerStartTick >= 0
    /\ serverTick >= timerStartTick + TimerDuration

\* All players have submitted answers
AllPlayersAnswered ==
    \A p \in Players : playerAnswered[p] = TRUE

\* All clients have received their pending updates
AllClientsSynced ==
    \A c \in Clients : pendingUpdate[c] = FALSE

\* What a client THINKS the time remaining is (based on skewed clock)
ClientPerceivedTimeLeft(c) ==
    IF timerStartTick < 0
    THEN 0
    ELSE LET clientNow == serverTick + clientClockSkew[c]
         IN  (timerStartTick + TimerDuration) - clientNow

\* Set all clients to pending
SetAllPending == [c \in Clients |-> TRUE]

\*---------------------------------------------------------------------
\* Initial state
\*---------------------------------------------------------------------

Init ==
    /\ serverTick = 1
    /\ serverState = "idle"
    /\ timerStartTick = -1
    /\ playerAnswered = [p \in Players |-> FALSE]
    /\ clientClockSkew = [c \in Clients |-> 0]
    /\ clientView = [c \in Clients |-> "synced"]
    /\ pendingUpdate = [c \in Clients |-> FALSE]

\*---------------------------------------------------------------------
\* Server actions
\*---------------------------------------------------------------------

\* Host starts a new question (transitions idle -> questionActive)
\* FIXED: Guarded — all clients must have received previous updates
StartQuestion ==
    /\ serverState = "idle"
    /\ AllClientsSynced
    /\ serverState' = "questionActive"
    /\ timerStartTick' = serverTick
    /\ playerAnswered' = [p \in Players |-> FALSE]
    /\ clientView' = [c \in Clients |-> "timer"]
    /\ pendingUpdate' = SetAllPending
    /\ UNCHANGED <<serverTick, clientClockSkew>>

\* Server timer expires -> advance to questionPrep
ServerTimerFires ==
    /\ serverState = "questionActive"
    /\ ServerTimerExpired
    /\ serverState' = "questionPrep"
    /\ timerStartTick' = -1
    /\ pendingUpdate' = SetAllPending
    /\ UNCHANGED <<serverTick, playerAnswered, clientClockSkew, clientView>>

\* A player submits an answer
SubmitAnswer(p) ==
    /\ serverState = "questionActive"
    /\ playerAnswered[p] = FALSE
    /\ ~ServerTimerExpired
    /\ playerAnswered' = [playerAnswered EXCEPT ![p] = TRUE]
    /\ UNCHANGED <<serverTick, serverState, timerStartTick, clientClockSkew,
                   clientView, pendingUpdate>>

\* All players answered -> server auto-advances
AutoAdvanceAllAnswered ==
    /\ serverState = "questionActive"
    /\ AllPlayersAnswered
    /\ ~ServerTimerExpired
    /\ serverState' = "questionPrep"
    /\ timerStartTick' = -1
    /\ pendingUpdate' = SetAllPending
    /\ UNCHANGED <<serverTick, playerAnswered, clientClockSkew, clientView>>

\* Server advances from questionPrep back to idle (ready for next question)
FinishPrep ==
    /\ serverState = "questionPrep"
    /\ serverState' = "idle"
    /\ pendingUpdate' = SetAllPending
    /\ UNCHANGED <<serverTick, timerStartTick, playerAnswered, clientClockSkew, clientView>>

\*---------------------------------------------------------------------
\* Network / message delivery (per-socket serialization)
\*---------------------------------------------------------------------

\* Client receives a serialized state update (per-socket promise chain)
\* FIXED: Each client independently processes its own pending update.
\* The client syncs to the CURRENT server state (per-socket serialization
\* ensures the latest snapshot is delivered).
ClientReceivesUpdate(c) ==
    /\ pendingUpdate[c] = TRUE
    /\ clientView' = [clientView EXCEPT ![c] =
        IF serverState = "questionPrep" \/ serverState = "idle"
        THEN "synced"
        ELSE "timer"]
    /\ pendingUpdate' = [pendingUpdate EXCEPT ![c] = FALSE]
    /\ UNCHANGED <<serverTick, serverState, timerStartTick, playerAnswered, clientClockSkew>>

\*---------------------------------------------------------------------
\* Clock and time progression
\*---------------------------------------------------------------------

\* Time passes (server tick advances)
\* Bound the state space: only tick up to timer end + skew + buffer
Tick ==
    /\ serverTick < TimerDuration + MaxClockSkew + 5
    /\ serverTick' = serverTick + 1
    /\ UNCHANGED <<serverState, timerStartTick, playerAnswered, clientClockSkew,
                   clientView, pendingUpdate>>

\* A client's clock drifts (models real-world clock skew)
\* Only happens before timer starts, to keep state space manageable
ClockDrift(c) ==
    /\ serverState = "idle"
    /\ \E delta \in {-1, 0, 1} :
        /\ clientClockSkew[c] + delta >= -MaxClockSkew
        /\ clientClockSkew[c] + delta <= MaxClockSkew
        /\ clientClockSkew' = [clientClockSkew EXCEPT ![c] = @ + delta]
    /\ UNCHANGED <<serverTick, serverState, timerStartTick, playerAnswered,
                   clientView, pendingUpdate>>

\*---------------------------------------------------------------------
\* Next-state relation
\*---------------------------------------------------------------------

Next ==
    \/ StartQuestion
    \/ ServerTimerFires
    \/ \E p \in Players : SubmitAnswer(p)
    \/ AutoAdvanceAllAnswered
    \/ FinishPrep
    \/ \E c \in Clients : ClientReceivesUpdate(c)
    \/ Tick
    \/ \E c \in Clients : ClockDrift(c)

\*---------------------------------------------------------------------
\* SAFETY INVARIANTS
\*---------------------------------------------------------------------

\* INV1: When server is NOT in questionActive, no client should show "timer"
\* unless that client still has a pending update to receive
TimerAgreement ==
    serverState /= "questionActive" =>
        \A c \in Clients : clientView[c] /= "timer" \/ pendingUpdate[c] = TRUE

\* INV2: A question is processed at most once
NoDoubleProcess ==
    serverState = "questionPrep" => timerStartTick = -1

\* INV3: Client perceived time left bounded by clock skew
\* When timer is active, disagreement is exactly the clock skew
BoundedTimerDisagreement ==
    (serverState = "questionActive" /\ timerStartTick >= 0) =>
        \A c \in Clients :
            LET serverTimeLeft == (timerStartTick + TimerDuration) - serverTick
                clientTimeLeft == ClientPerceivedTimeLeft(c)
                diff == clientTimeLeft - serverTimeLeft
            IN  diff >= -MaxClockSkew /\ diff <= MaxClockSkew

\*---------------------------------------------------------------------
\* LIVENESS (temporal properties)
\*---------------------------------------------------------------------

\* If all players answer, the question EVENTUALLY advances
AllAnsweredImpliesAdvance ==
    [](AllPlayersAnswered /\ serverState = "questionActive" =>
       <>(serverState = "questionPrep"))

\* Clients EVENTUALLY sync after server advances
ClientsEventuallySync ==
    [](serverState = "questionPrep" =>
       <>(\A c \in Clients : clientView[c] = "synced"))

\*---------------------------------------------------------------------
\* Fairness (needed for liveness)
\*---------------------------------------------------------------------

Fairness ==
    /\ WF_vars(ServerTimerFires)
    /\ WF_vars(AutoAdvanceAllAnswered)
    /\ WF_vars(FinishPrep)
    /\ \A c \in Clients : WF_vars(ClientReceivesUpdate(c))
    /\ WF_vars(Tick)

\*---------------------------------------------------------------------
\* Spec
\*---------------------------------------------------------------------

Spec == Init /\ [][Next]_vars /\ Fairness

\* Symmetry optimization
PlayerSymmetry == Permutations(Players)

====
