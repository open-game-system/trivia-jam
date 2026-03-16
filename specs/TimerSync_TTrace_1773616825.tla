---- MODULE TimerSync_TTrace_1773616825 ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, TimerSync_TEConstants, TimerSync

_expression ==
    LET TimerSync_TEExpression == INSTANCE TimerSync_TEExpression
    IN TimerSync_TEExpression!expression
----

_trace ==
    LET TimerSync_TETrace == INSTANCE TimerSync_TETrace
    IN TimerSync_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        serverState = ("questionActive")
        /\
        playerAnswered = ((p1 :> FALSE @@ p2 :> FALSE))
        /\
        lastPushedState = ("questionActive")
        /\
        clientView = ((p1 :> "timer" @@ p2 :> "timer" @@ "host" :> "timer"))
        /\
        msgInFlight = (FALSE)
        /\
        serverTick = (0)
        /\
        clientClockSkew = ((p1 :> 0 @@ p2 :> 0 @@ "host" :> 0))
        /\
        timerStartTick = (0)
    )
----

_init ==
    /\ playerAnswered = _TETrace[1].playerAnswered
    /\ clientClockSkew = _TETrace[1].clientClockSkew
    /\ serverTick = _TETrace[1].serverTick
    /\ lastPushedState = _TETrace[1].lastPushedState
    /\ clientView = _TETrace[1].clientView
    /\ msgInFlight = _TETrace[1].msgInFlight
    /\ timerStartTick = _TETrace[1].timerStartTick
    /\ serverState = _TETrace[1].serverState
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
        /\ playerAnswered  = _TETrace[i].playerAnswered
        /\ playerAnswered' = _TETrace[j].playerAnswered
        /\ clientClockSkew  = _TETrace[i].clientClockSkew
        /\ clientClockSkew' = _TETrace[j].clientClockSkew
        /\ serverTick  = _TETrace[i].serverTick
        /\ serverTick' = _TETrace[j].serverTick
        /\ lastPushedState  = _TETrace[i].lastPushedState
        /\ lastPushedState' = _TETrace[j].lastPushedState
        /\ clientView  = _TETrace[i].clientView
        /\ clientView' = _TETrace[j].clientView
        /\ msgInFlight  = _TETrace[i].msgInFlight
        /\ msgInFlight' = _TETrace[j].msgInFlight
        /\ timerStartTick  = _TETrace[i].timerStartTick
        /\ timerStartTick' = _TETrace[j].timerStartTick
        /\ serverState  = _TETrace[i].serverState
        /\ serverState' = _TETrace[j].serverState

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("TimerSync_TTrace_1773616825.json", _TETrace)

=============================================================================

 Note that you can extract this module `TimerSync_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `TimerSync_TEExpression.tla` file takes precedence 
  over the module `TimerSync_TEExpression` below).

---- MODULE TimerSync_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, TimerSync_TEConstants, TimerSync

expression == 
    [
        \* To hide variables of the `TimerSync` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        playerAnswered |-> playerAnswered
        ,clientClockSkew |-> clientClockSkew
        ,serverTick |-> serverTick
        ,lastPushedState |-> lastPushedState
        ,clientView |-> clientView
        ,msgInFlight |-> msgInFlight
        ,timerStartTick |-> timerStartTick
        ,serverState |-> serverState
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_playerAnsweredUnchanged |-> playerAnswered = playerAnswered'
        
        \* Format the `playerAnswered` variable as Json value.
        \* ,_playerAnsweredJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(playerAnswered)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_playerAnsweredModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].playerAnswered # _TETrace[s-1].playerAnswered
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE TimerSync_TETrace ----
\*EXTENDS IOUtils, TLC, TimerSync_TEConstants, TimerSync
\*
\*trace == IODeserialize("TimerSync_TTrace_1773616825.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE TimerSync_TETrace ----
EXTENDS TLC, TimerSync_TEConstants, TimerSync

trace == 
    <<
    ([serverState |-> "idle",playerAnswered |-> (p1 :> FALSE @@ p2 :> FALSE),lastPushedState |-> "idle",clientView |-> (p1 :> "synced" @@ p2 :> "synced" @@ "host" :> "synced"),msgInFlight |-> FALSE,serverTick |-> 0,clientClockSkew |-> (p1 :> 0 @@ p2 :> 0 @@ "host" :> 0),timerStartTick |-> 0]),
    ([serverState |-> "questionActive",playerAnswered |-> (p1 :> FALSE @@ p2 :> FALSE),lastPushedState |-> "questionActive",clientView |-> (p1 :> "timer" @@ p2 :> "timer" @@ "host" :> "timer"),msgInFlight |-> FALSE,serverTick |-> 0,clientClockSkew |-> (p1 :> 0 @@ p2 :> 0 @@ "host" :> 0),timerStartTick |-> 0])
    >>
----


=============================================================================

---- MODULE TimerSync_TEConstants ----
EXTENDS TimerSync

CONSTANTS p1, p2

=============================================================================

---- CONFIG TimerSync_TTrace_1773616825 ----
CONSTANTS
    Players = { p1 , p2 }
    MaxClockSkew = 2
    TimerDuration = 3
    p2 = p2
    p1 = p1

INVARIANT
    _inv

CHECK_DEADLOCK
    \* CHECK_DEADLOCK off because of PROPERTY or INVARIANT above.
    FALSE

INIT
    _init

NEXT
    _next

CONSTANT
    _TETrace <- _trace

ALIAS
    _expression
=============================================================================
\* Generated on Sun Mar 15 16:20:25 PDT 2026