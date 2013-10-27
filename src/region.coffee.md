    O                     = require 'omicron'
    state                 = require './state-function'
    State                 = require './state'
    StateExpression       = null
    Transition            = null
    TransitionExpression  = null

    { STATE_ATTRIBUTES, REGION_STATES } = state

    module.exports =



## [Region](#region)

A **region** is a subtree of the `owner`’s **state tree** over which a single
**currency** is defined, and within which all **transitions** of this currency
are confined. The set of all `Region`s in a state tree is defined as the
**root state** plus all immediate substates of any `concurrent` `State`.

    class Region extends State

      { trim, type, isEmpty, isArray } = O
      { slice } = Array::

      { VIRTUAL, ABSTRACT, CONCLUSIVE, FINAL, RETAINED, IMMEDIATE } = this
      { CONCURRENT, ORTHOGONAL, PERMANENT, AUTONOMOUS, VOLATILE } = this
      { VIA_NONE, VIA_PROTO } = this

      { NASCENT, ACTIVE, TRANSITIONING, SUSPENDED, TERMINATED } = REGION_STATES



### [Constructor](#region--constructor)

      constructor: ( base, name, expression ) ->
        super

        @_state = NASCENT

        @_current = null

While a `Transition` is underway, `_current` will be a reference to that
transition. To further distinguish this condition, an identical reference is
also held at `_transition`.

        @_transition = null



### [Private functions](#region--private)


#### [activate]()

      activate: ( initialState ) ->
        if @_state & TERMINATED and @attributes & PERMANENT
          throw Error "'#{@path()}': cannot reactivate terminated currency"

Determine the initial state, and set the `current` state to that.

        current = ( if initialState? then @query initialState else
          @initialSubstate() ) ? this

The initial state may be `abstract`, in which case the `current` reference must
snap to the abstract state’s default `concrete` substate.

        if current.attributes & ABSTRACT
          current = current.defaultSubstate() ? current

The previous redirections may have left `current` pointing to a protostate, in
which case a virtual state must be created in `this` root’s tree.

        current = current.virtualize this if current.root isnt this

With `current` now resolved, the authoritative reference to it is held here.

        @_current = current
        @_state = ACTIVE
        current


#### [suspend]()

      suspend: ->
        if @_state & ACTIVE
          @_state = SUSPENDED
        else
          throw Error "'#{@path()}': cannot suspend inactive currency"
        return


#### [evaluateGuard](#region--private--evaluate-guard)

Returns the boolean result of a `guard` function in the `context` of a `State`,
as evaluated `against` another `State`. Defaults to `true` if no guard exists.

      evaluateGuard = ( context, guard, against ) ->
        guard = context.guard guard if typeof guard is 'string'
        return true unless guard

        args = slice.call arguments, 1
        for own key, value of guard
          valueIsFn = typeof value is 'function'
          selectors = trim( key ).split /\s*,+\s*/
          for selector in selectors when context.query selector, against
            result = if valueIsFn then value.apply context, args else value
            break
          break unless result
        !!result



### [Methods](#region--methods)


#### [getTransitionExpression](#region--prototype--get-transition-expression)

Finds the appropriate transition expression for the given `target` and `origin`
states. If no matching transitions are defined in either state or any of their
ancestors, a generic actionless transition expression for the pair is returned.

###### PARAMETERS

* `target` : `State`
* `origin` : `State` (optional) — defaults to the `current` state.

###### SOURCE

      getTransitionExpression: do ->

        search = ( target, origin, subject, ceiling ) ->
          while subject and subject isnt ceiling
            for own key, expr of subject.transitions()
              return expr if (
                not ( guards = expr.guards ) or (
                  not ( admit = guards.admit ) or
                  isEmpty( admit ) or
                  evaluateGuard.call origin, admit, target, origin
                ) and (
                  not ( release = guards.release ) or
                  isEmpty( release ) or
                  evaluateGuard.call target, release, origin, target
                )
              ) and (
                if expr.target then subject.query expr.target, target
                else subject is target
              ) and ( not expr.origin or subject.query expr.origin, origin )
            break unless ceiling?
            subject = subject.superstate

        ( target, origin = @_current ) ->
          ( search target, origin, target ) or
          ( search target, origin, origin unless origin is target ) or
          ( search target, origin, target.superstate, @root ) or
          ( search target, origin, @root ) or
          ( unless target.isIn origin
            search target, origin, origin.superstate, origin.common target ) or
          new TransitionExpression


#### [change](#region--prototype--change)

Attempts to execute a state **transition**.

###### SYNOPSIS

Conducts sync/async transitions, emits relevant transitional **events**, and
creates any necessary temporary **virtual states** for prototypal inheritors.

Rules imposed by all **guards** held on both the origin and `target` states are
respected, and if these are not satisfied the transition will be denied.

###### PARAMETERS

The `target` parameter may be either a `State` object within the tree of this
`RootState`, or a string that resolves to a likewise targetable `State` when
evaluated from the context of the most recently current state.

The `options` parameter is an optional map that may include:

  * `args` : array — arguments to be passed to a transition’s `action`.
  * `success` : function — invoked if the transition attempt succeeds.
  * `failure` : function — invoked if the transition attempt fails.

###### SOURCE

      change: ( target, options ) ->
        { root, owner } = this
        current = @_current
        transition = @_transition

The `origin` is defined as the controller’s most recently current state that is
not a `Transition`.

        origin = transition?.origin or current

Departures are not allowed from a state that is `final`.

        return null if origin.attributes & FINAL

Ensure that `target` is a valid `State`.

        unless target instanceof State
          target = if target then origin.query target else root
        return null unless target
        targetOwner = target.owner
        return null if owner isnt targetOwner and
          not targetOwner.isPrototypeOf owner

Extract `args` from `options` and resolve `options` to an object if necessary.

        if options?
          args = if ( isArray options ) or ( type options ) is 'arguments'
          then options
          else options.args
          args = slice.call args if args?

If `target` is a `retained` state, restore its currency by redirecting to its
retained internal substate.

        if target.attributes & RETAINED
          target = retainee if retainee = target.query target._.retaineePath

A transition cannot target an abstract state directly, so `target` must be
reassigned to the appropriate concrete substate.

        while target.attributes & ABSTRACT
          return null unless target = target.defaultSubstate()

If any guards are in place for the given `origin` and `target`, both of those
states must consent to the transition.

        unless options?.forced
          released = evaluateGuard origin, 'release', target
          admitted = evaluateGuard target, 'admit', origin
          unless released and admitted
            options?.failure?.call? this
            return null

If `target` is a protostate, then the protostate must be virtualized locally
and `target` must be reassigned to the new virtual state.

        target = target.virtualize this unless target?.root is root

A reference is held to the previously current state, or abortive transition.

        source = current

The upcoming transition will start from its `source` and proceed within the
`domain` of the least common ancestor between `source` and `target`.

        domain = source.common target

Conclusivity is enforced by checking each state that will be exited against the
`conclusive` attributes.

        s = source; until s is domain
          return null if s.attributes & CONCLUSIVE
          s = s.superstate

If a previously initiated transition is still underway, it needs to be notified
that it will not finish.

        transition?.abort()

Retrieve the appropriate transition expression for this origin/target pairing.
If none is defined, then an actionless default transition will be created and
applied, causing the callback to return immediately.

        @_transition = transition = new Transition target, source,
          @getTransitionExpression target, origin

Preparation for the transition begins by emitting a `depart` event on the
`source` state.

        eventArgs = [ transition, args ]
        source.emit 'depart', eventArgs, VIA_PROTO
        @_transition = transition = null if transition.aborted

Enter into the transition state.

        if transition
          @_current = transition
          transition.emit 'enter', VIA_NONE
          @_transition = transition = null if transition.aborted

Walk up to the top of the domain, emitting `exit` events for each state along
the way.

        s = source; while transition and s isnt domain
          if s.attributes & RETAINED
            s._.retaineePath = transition.origin.path()
          s.emit 'exit', eventArgs, VIA_PROTO
          transition.superstate = s = s.superstate
          @_transition = transition = null if transition.aborted

A callback will be invoked from `transition.end()` to conclude the transition.

        transition?.callback = ->
          transition = null if transition.aborted

Trace a path from `target` up to `domain`, then walk down it, emitting `enter`
events for each state along the way.

          if transition
            s = target; pathToState = []; while s isnt domain
              pathToState.push s
              s = s.superstate
          s = domain; while transition and substate = pathToState.pop()
            transition.superstate = substate
            substate.emit 'enter', eventArgs, VIA_PROTO
            transition = null if transition.aborted
            s = substate

Exit from the transition state.

          if transition
            transition.emit 'exit', VIA_NONE
            transition = null if transition.aborted

Terminate the transition with an `arrive` event on the targeted state.

          if transition
            @_current = target
            target.emit 'arrive', eventArgs, VIA_PROTO

Any virtual states that were previously active may now be discarded.

            s = origin; while s.attributes & VIRTUAL
              ss = s.superstate
              do s.destroy
              s = ss

Now complete, the `Transition` instance can be discarded.

            do transition.destroy
            @_transition = transition = null

            options?.success?.call? this

            return target

          return null

At this point the transition is attached to the `domain` state and is ready to
proceed.

        return transition?.start.apply( transition, args ) or @_current



### [Forward imports](#region--forward-imports)

    StateExpression       = require './state-expression'
    Transition            = require './transition'
    TransitionExpression  = require './transition-expression'