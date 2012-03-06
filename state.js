( function ( undefined ) {

"use strict";

var global = this,

    // The lone dependency of `state` is [`zcore`](http://github.com/zvector/zcore), a small
    // collection of utility functions.
    Z = typeof require !== 'undefined' ? require('zcore') : global.Z;

// <a id="module" />

// ## state()
// 
// The `state` module is exported as a function. This function can be used either to create and
// return a `StateDefinition`, or to apply a new state implementation to an arbitrary owner
// object, in which case the owner’s initial `State` is returned.
// 
// All of the function’s arguments are optional. If both an `owner` and `definition` are provided,
// the initial `State` in the owner’s new state implementation is returned; otherwise, the
// function returns a `StateDefinition`. The `options` parameter applies only in the former case.
// 
// *See also:* [`State`](#state), [`StateDefinition`](#state-definition),
// [`StateController`](#state-controller)
function state (
                      /*Object*/ owner,      // optional
                      /*String*/ attributes, // optional
    /*StateDefinition | Object*/ definition, // optional
             /*Object | String*/ options     // optional
) {
    if ( arguments.length < 2 ) {
        typeof owner === 'string' ? ( attributes = owner ) : ( definition = owner );
        owner = undefined;
    } else {
        typeof owner === 'string' &&
            ( options = definition, definition = attributes, attributes = owner,
                owner = undefined );
        typeof attributes === 'string' ||
            ( options = definition, definition = attributes, attributes = undefined );
    }

    definition = new StateDefinition( attributes, definition );

    return owner ?
        new StateController( owner, definition, options ).current() :
        definition;
}

// ### Module-level constants

// #### State attributes
// 
// These values are stored as a bit field in a `State` instance.
var STATE_ATTRIBUTES = {
        NORMAL      : 0x0,

        // A **virtual state** is a lightweight inheritor of a **protostate** located higher in the
        // owner object’s prototype chain.
        VIRTUAL     : 0x1,

        // Marking a state `initial` specifies which state a newly instantiated `StateController`
        // should assume.
        INITIAL     : 0x2,

        // Once a state marked `final` is entered, no further outbound transitions within its local
        // region are allowed.
        FINAL       : 0x4,

        // An **abstract state** cannot itself be current. Consequently a transition target that
        // points to a state marked `abstract` is redirected to one of its substates.
        ABSTRACT    : 0x8,

        // Marking a state `default` designates it as the actual target for any transition that
        // targets its abstract superstate.
        DEFAULT     : 0x10,

        // A state marked `sealed` cannot have substates.
        SEALED      : 0x20,

        // A `retained` state is one that preserves its own internal state, such that, after the
        // state has become no longer active, a subsequent transition targeting that particular
        // state will automatically be redirected to whichever of its descendant states was most
        // recently current.
        // *(Reserved; not presently implemented.)*
        RETAINED    : 0x40,

        // Marking a state with the `history` attribute causes its internal state to be recorded
        // in a sequential **history**. Whereas a `retained` state is concerned only with the most
        // recent internal state, a state’s history can be traversed and altered, resulting in
        // transitions back or forward to previously or subsequently held internal states.
        // *(Reserved; not presently implemented.)*
        HISTORY     : 0x80,

        // Normally, states that are `retained` or that keep a `history` persist their internal
        // state *deeply*, i.e., with a scope extending over all of the state’s descendant states.
        // Marking a state `shallow` limits the scope of its persistence to its immediate
        // substates only.
        // *(Reserved; not presently implemented.)*
        SHALLOW     : 0x100,

        // Causes alterations to a state to result in a reflexive transition, with a delta object
        // distinguishing the prior version of the state from its new version. Should also add a
        // history entry wherever appropriate, representing the prior version and the delta.
        // *(Reserved; not presently implemented.)*
        VERSIONED   : 0x200,

        // In a state marked `regioned`, the substates are considered **concurrent orthogonal
        // regions**. Upon entering a regioned state, the controller creates a new set of
        // subcontrollers, one for each region, which will exist as long as the regioned state
        // remains active. Method calls are forwarded to at most one of the regions, or if a
        // reduction function is associated with the given method, the call is repeated for each
        // region and the results reduced accordingly on their way back to the owner. Event
        // emissions, which have void return types, are simply propagated to all of the regions.
        // *(Reserved; not presently implemented.)*
        REGIONED    : 0x400
    },

    // The subset of attributes that are valid keywords for the `attributes` argument in a call to
    // the exported `state` function.
    STATE_ATTRIBUTE_MODIFIERS =
        'initial final abstract default sealed retained history shallow versioned regioned',
    
    // 
    STATE_DEFINITION_CATEGORIES =
        'data methods events guards states transitions',
    
    STATE_EVENT_TYPES =
        'construct depart exit enter arrive destroy mutate',
    
    GUARD_ACTIONS =
        'admit release',
    
    TRANSITION_PROPERTIES =
        'origin source target action conjugate',
    
    TRANSITION_DEFINITION_CATEGORIES =
        'methods events',
    
    TRANSITION_EVENT_TYPES =
        'construct destroy enter exit start end abort';

Z.env.server && ( module.exports = exports = state );
Z.env.client && ( global['state'] = state );

Z.assign( state, {
    VERSION: '0.0.3',

    noConflict: ( function () {
        var autochthon = global.state;
        return function () {
            global.state = autochthon;
            return this;
        };
    })()
});

// <a id="state" />

// ## State
// 
// A **state** models a set of behaviors for an owner object. The owner may undergo **transitions**
// that change its **current** state from one to another, and in so doing adopt a different set of
// behaviors.
// 
// Distinct behaviors are modeled in each state by defining a set of method overrides, to which
// calls made on the owner will be redirected so long as a state remains current.
// 
// States are nested hierarchically in a tree structure, with **substates** that inherit from their 
// **superstate**. While a substate is current, both it and the transitive closure of its
// superstates (i.e., its “ancestor superstates”) are considered to be **active**.
// 
// In addition, a state also recognizes the owner object’s prototypal inheritance, identifying an
// identically named and positioned state in the prototype as its **protostate**. Behavior is
// always inherited *from protostates first*, then from superstates.

var State = ( function () {
    var SA = STATE_ATTRIBUTES;

    Z.assign( State, SA );

    // ### Constructor
    function State ( superstate, name, definition ) {
        if ( !( this instanceof State ) ) {
            return new State( superstate, name, definition );
        }
        
        var attributes = definition && definition.attributes || SA.NORMAL;
        
        // #### attributes
        // 
        // Returns the bit field of this state’s attributes.
        this.attributes = function () { return attributes; };

        // #### name
        // 
        // Returns the local name of this state.
        this.name = Z.stringFunction( function () { return name || ''; } );

        // Do the minimal setup required for a virtual state.
        if ( attributes & SA.VIRTUAL ) {
            this.superstate = State.privileged.superstate( superstate );

            // #### reify
            // 
            // Virtual states are weakly bound to a state hierarchy by their reference held at
            // `superstate`; they are not proper members of the superstate’s set of substates. The
            // `reify` method allows a virtual state to transform itself at some later time into a
            // “real” state, with its own set of closed properties and methods, existing thereafter
            // as an abiding member of its superstate’s set of substates.
            this.reify = function ( definition ) {
                delete this.reify;
                attributes &= ~SA.VIRTUAL;

                superstate.addSubstate( name, this ) &&
                    reify.call( this, superstate, attributes, definition );
                
                return this;
            };
        }

        // Do the full setup required for a real state.
        else {
            reify.call( this, superstate, attributes, definition );
        }
    }

    // ### Class-private functions

    // #### reify
    // 
    // The reification procedure is offloaded from the constructor, allowing for construction of
    // virtual `State` instances that inherit all of their functionality from protostates.
    function reify ( superstate, attributes, definition ) {
        var data = {},
            methods = {},
            events = {},
            guards = {},
            substates = {},
            transitions = {},
            history = attributes & SA.HISTORY || attributes & SA.RETAINED ? [] : null;
        
        // (Exposed for debugging.)
        Z.env.debug && Z.assign( this.__private__ = {}, {
            attributes: attributes,
            data: data,
            methods: methods,
            events: events,
            guards: guards,
            substates: substates,
            transitions: transitions
        });
        
        function setSuperstate ( value ) { return superstate = value; }
        
        // Method names are mapped to specific local variables. The named methods are created on
        // `this`, each of which is a partial application of its corresponding method factory at
        // `State.privileged`.
        Z.privilege( this, State.privileged, {
            'init' : [ StateDefinition ],
            'superstate' : [ superstate ],
            'data' : [ data ],
            'method methodNames addMethod removeMethod' : [ methods ],
            'event addEvent removeEvent emit' : [ events ],
            'guard addGuard removeGuard' : [ guards ],
            'substate substates addSubstate removeSubstate' : [ substates ],
            'transition transitions addTransition' : [ transitions ],
            'destroy' : [ setSuperstate, methods, events, substates ]
        });
        history && Z.privilege( this, State.privileged, {
            'history push replace' : [ history ]
        });
        Z.alias( this, { addEvent: 'on bind', removeEvent: 'off unbind', emit: 'trigger' } );

        // If no superstate is given, e.g. for a root state being created by a `StateController`,
        // then `init()` must be called later by the implementor.
        superstate && this.init( definition );

        return this;
    }

    // #### createDelegator
    // 
    // Creates a function that will serve as a **delegator** method on an owner object. For each
    // method defined in any of the owner’s states, a delegator must be created and assigned on
    // the owner itself, at the `methodName` key. This delegator then forwards any calls to
    // `methodName` to the owner’s current state, which will locate the appropriate implementation
    // for the method, apply it, and return the result.
    // 
    // If an owner already has an implementation for a delegated method, it is copied into the
    // owner’s root state, such that it remains accessible as the owner’s “default behavior” if
    // none of its active states contains an implementation for that method.
    // 
    // Stateful methods are applied in the context of the `State` to which they belong, or, if a
    // method is inherited from a protostate, the context will be the corresponding virtual state
    // within the local `StateController`. However, for any a priori methods relocated to the root
    // state, the context appropriately remains bound to the owner object.
    // 
    // *See also:* `State.privileged.addMethod`
    function createDelegator ( accessorKey, methodName, original ) {
        function delegator () {
            return this[ accessorKey ]().apply( methodName, arguments );
        }
        
        delegator.isDelegator = true;
        original && ( delegator.original = original );

        return delegator;
    }

    // ### Privileged methods
    // 
    // Methods defined here are partially applied from within a constructor.
    State.privileged = {

        // #### init
        // 
        // Builds out the state’s members based on the contents of the supplied definition.
        init: function ( /*Function*/ definitionConstructor ) {
            return function ( /*<definitionConstructor> | Object*/ definition ) {
                var category,
                    self = this;
                
                definition instanceof definitionConstructor ||
                    ( definition = definitionConstructor( definition ) );
                
                this.initializing = true;

                definition.data && this.data( definition.data );
                Z.forEach({
                    methods: function ( methodName, fn ) {
                        self.addMethod( methodName, fn );
                    },
                    events: function ( eventType, fn ) {
                        var i, l;
                        Z.isArray( fn ) || ( fn = [ fn ] );
                        for ( i = 0, l = fn.length; i < l; i++ ) {
                            self.addEvent( eventType, fn[i] );
                        }
                    },
                    guards: function ( guardType, guard ) {
                        self.addGuard( guardType, guard );
                    },
                    states: function ( stateName, stateDefinition ) {
                        self.addSubstate( stateName, stateDefinition );
                    },
                    transitions: function ( transitionName, transitionDefinition ) {
                        self.addTransition( transitionName, transitionDefinition );
                    }
                }, function ( fn, category ) {
                    definition[ category ] && Z.each( definition[ category ], fn );
                });
        
                delete this.initializing;

                this.emit( 'construct', { definition: definition }, false );
        
                return this;
            };
        },

        // #### superstate
        // 
        // Returns the immediate superstate, or the nearest state in the superstate chain with
        // the provided `stateName`.
        superstate: function ( /*State*/ superstate ) {
            return function (
                /*String*/ stateName // optional
            ) {
                return stateName === undefined ?
                    superstate
                    :
                    superstate ?
                        stateName ?
                            superstate.name() === stateName ?
                                superstate : superstate.superstate( stateName )
                            :
                            this.controller().root()
                        :
                        undefined;
            }
        },

        // #### data
        // 
        // Either retrieves or edits a block of data associated with this state.
        // 
        // `data( [Boolean viaSuper], [Boolean viaProto] )`
        // 
        // Retrieves data attached to this state, including all data from inherited states, unless
        // specified otherwise by the inheritance flags `viaSuper` and `viaProto`.
        // 
        // `data( Object edit )`
        // 
        // Edits data on this state. For keys in `edit` whose values are set to the `NIL`
        // directive, the matching keys in `data` are deleted. If the operation results in a change
        // to `data`, a `mutate` event is emitted for this state.
        data: function ( /*Object*/ data ) {
            return function ( /*Boolean*/ viaSuper, /*Boolean*/ viaProto ) {
                var edit, delta, superstate, protostate;

                if ( viaSuper != null && typeof viaSuper !== 'boolean' ) {
                    edit = viaSuper, viaSuper = viaProto = false;
                } else {
                    viaSuper === undefined && ( viaSuper = true );
                    viaProto === undefined && ( viaProto = true );
                }

                if ( edit && !Z.isEmpty( edit ) ) {
                    if ( this.isVirtual() ) return this.reify().data( edit );

                    delta = Z.delta( data, edit );
                    if ( !this.initializing && delta && !Z.isEmpty( delta ) ) {
                        this.emit( 'mutate', [ edit, delta ], false );
                    }
                }
                else {
                    return Z.clone(
                        viaSuper && ( superstate = this.superstate() ) &&
                            superstate.data(),
                        viaProto && ( protostate = this.protostate() ) &&
                            protostate.data( false ),
                        data
                    );
                }

                return this;
            }
        },

        // #### method
        // 
        // Retrieves the named method held on this state. If no method is found, step through
        // this state’s protostate chain to find one. If no method is found there, step up the
        // superstate hierarchy and repeat the search.
        method: function ( methods ) {
            return function (
                 /*String*/ methodName,
                /*Boolean*/ viaSuper,    // = true
                /*Boolean*/ viaProto,    // = true
                 /*Object*/ out          // optional
            ) {
                var superstate, protostate, method;

                viaSuper === undefined && ( viaSuper = true );
                viaProto === undefined && ( viaProto = true );
                
                methods && ( method = methods[ methodName ] );
                
                return (
                    method && method !== Z.noop &&
                            ( out && ( out.context = this, out.method = method ), method )
                        ||
                    viaProto &&
                            ( protostate = this.protostate() ) &&
                            ( method = protostate.method( methodName, false, true, out ) ) &&
                            ( out && ( out.context = this ), method )
                        ||
                    viaSuper &&
                            ( superstate = this.superstate() ) &&
                            superstate.method( methodName, true, viaProto, out )
                        ||
                    ( out && ( out.context = null, out.method = method ), method )
                );
            };
        },

        // #### methodNames
        // 
        // Returns an `Array` of names of methods defined for this state.
        methodNames: function ( methods ) {
            return function () {
                return Z.keys( methods );
            };
        },

        // #### addMethod
        // 
        // Adds a method to this state, which will be callable directly from the owner, but with
        // its context bound to the state.
        addMethod: function ( methods ) {
            return function ( /*String*/ methodName, /*Function*/ fn ) {
                var controller = this.controller(),
                    controllerName = controller.name(),
                    root = controller.root(),
                    owner = controller.owner(),
                    ownerMethod;

                if ( this.isVirtual() ) return this.reify().addMethod( methodName, fn );

                // If there is not already a method called `methodName` in the state hierarchy,
                // then the owner and controller need to be set up properly to accommodate calls
                // to this method.
                if ( !this.method( methodName, true, false ) ) {
                    if ( this !== root && !root.method( methodName, false, false ) ) {
                        ownerMethod = owner[ methodName ];
                        if ( ownerMethod === undefined || ownerMethod.isDelegator ) {
                            ownerMethod = Z.noop;
                        }
                        root.addMethod( methodName, ownerMethod );
                    }

                    // A delegator function is instated on the owner, which will direct subsequent
                    // calls to `owner[ methodName ]` to the controller, and then on to the
                    // appropriate state’s implementation.
                    owner[ methodName ] =
                        createDelegator( controllerName, methodName, ownerMethod );
                }

                return methods[ methodName ] = fn;
            };
        },

        // #### removeMethod
        // 
        // Dissociates the named method from this state object and returns its function.
        removeMethod: function ( methods ) {
            return function ( /*String*/ methodName ) {
                var fn = methods[ methodName ];
                delete methods[ methodName ];
                return fn;
            };
        },

        // #### event
        // 
        // Gets a registered event handler.
        event: function ( events ) {
            return function ( /*String*/ eventType, /*String*/ id ) {
                return events[ eventType ].get( id );
            };
        },

        // #### addEvent
        // 
        // Binds an event handler to the specified `eventType` and returns a unique identifier
        // for the handler. Recognized event types are listed at `StateEvent.types`.
        // 
        // *Aliases:* **on**, **bind**
        addEvent: function ( events ) {
            return function (
                  /*String*/ eventType,
                /*Function*/ fn,
                  /*Object*/ context    // = this
            ) {
                if ( this.isVirtual() ) return this.reify().addEvent( eventType, fn );

                Z.hasOwn.call( events, eventType ) ||
                    ( events[ eventType ] = new StateEventCollection( this, eventType ) );
                
                return events[ eventType ].add( fn, context );
            };
        },

        // #### removeEvent
        // 
        // Unbinds the event handler with the specified `id` that was supplied by `addEvent`.
        // 
        // *Aliases:* **off**, **unbind**
        removeEvent: function ( events ) {
            return function ( /*String*/ eventType, /*String*/ id ) {
                return events[ eventType ].remove( id );
            };
        },

        // #### emit
        // 
        // Invokes all bound handlers for the given event type.
        // 
        // *Alias:* **trigger**
        emit: function ( events ) {
            return function (
                 /*String*/ eventType,
                  /*Array*/ args,      // = []
                  /*State*/ context,   // = this
                /*Boolean*/ viaSuper,  // = true
                /*Boolean*/ viaProto   // = true
            ) {
                var e, protostate, superstate;

                if ( typeof eventType !== 'string' ) return;

                typeof args === 'boolean' &&
                    ( viaProto = viaSuper, viaSuper = context, context = args, args = undefined );
                typeof context === 'boolean' &&
                    ( viaProto = viaSuper, viaSuper = context, context = undefined );

                !args && ( args = [] ) || Z.isArray( args ) || ( args = [ args ] );
                viaSuper === undefined && ( viaSuper = true );
                viaProto === undefined && ( viaProto = true );

                ( e = events[ eventType ] ) && e.emit( args, context || this );

                viaProto && ( protostate = this.protostate() ) &&
                    protostate.emit( eventType, args, context || this, false );

                viaSuper && ( superstate = this.superstate() ) &&
                    superstate.emit( eventType, args, context || superstate );
            };
        },

        // #### guard
        // 
        // Gets a **guard** entity for this state. A guard is a value or function that will be
        // evaluated, as either a boolean or predicate, respectively, to provide a determination
        // of whether a controller will be admitted into or released from the state to which the
        // guard is applied. Guards are inherited from protostates, but not from superstates.
        // 
        // *See also:* `State.prototype.evaluateGuard`
        guard: function ( guards ) {
            return function ( /*String*/ guardType ) {
                var protostate;

                return (
                    guards[ guardType ]
                        ||
                    ( protostate = this.protostate() ) && protostate.guard( guardType )
                        ||
                    undefined
                );
            };
        },

        // #### addGuard
        // 
        // Adds a guard to the state.
        addGuard: function ( guards ) {
            return function ( /*String*/ guardType, guard ) {
                if ( this.isVirtual() ) return this.reify().addGuard( guardType, guard );

                return guards[ guardType ] = guard;
            };
        },

        // #### removeGuard
        // 
        // Removes a guard. *(Not presently implemented.)*
        removeGuard: function ( guards ) {
            return function ( /*String*/ guardType, /*String*/ guardKey ) {
                throw new Error( "Not implemented" );
            };
        },

        // #### substate
        // 
        // Retrieves the named substate of `this` state. If no such substate exists in the local
        // state, any identically named substate held on a protostate will be returned.
        substate: function ( substates ) {
            return function ( /*String*/ stateName, /*Boolean*/ viaProto ) {
                var s = this.controller().current(),
                    ss, protostate;
                
                viaProto === undefined && ( viaProto = true );

                // First scan for any virtual substates that are current on the local controller.
                for ( ; s && s.isVirtual() && ( ss = s.superstate() ); s = ss ) {
                    if ( ss === this && s.name() === stateName ) return s; 
                }

                // Otherwise retrieve a real substate, either locally or from a protostate.
                return (
                    substates && substates[ stateName ]
                        ||
                    viaProto && ( protostate = this.protostate() ) &&
                            protostate.substate( stateName )
                        ||
                    undefined
                );
            };
        },

        // #### substates
        // 
        // Returns an `Array` of this state’s substates.
        substates: function ( substates ) {
            return function ( /*Boolean*/ deep ) {
                var result = [],
                    key;
                
                for ( key in substates ) if ( Z.hasOwn.call( substates, key ) ) {
                    result.push( substates[ key ] );
                    deep && ( result = result.concat( substates[ key ].substates( true ) ) );
                }

                return result;
            };
        },

        // #### addSubstate
        // 
        // Creates a state from the supplied `stateDefinition` and adds it as a substate of
        // this state. If a substate with the same `stateName` already exists, it is first
        // destroyed and then replaced. If the new substate is being added to the controller’s
        // root state, a reference is added directly on the controller itself as well.
        addSubstate: function ( substates ) {
            return function (
                /*String*/ stateName,
                /*StateDefinition | Object | State*/ stateDefinition
            ) {
                var substate, controller;
                
                if ( this.isVirtual() ) {
                    return this.reify().addSubstate( stateName, stateDefinition );
                }
                if ( this.isSealed() ) {
                    throw new Error;
                }

                ( substate = substates[ stateName ] ) && substate.destroy();
                
                substate = stateDefinition instanceof State ?
                    stateDefinition.superstate() === this && stateDefinition.reify() :
                    new State( this, stateName, stateDefinition );
                
                if ( !substate ) return;
                
                this[ stateName ] = substates[ stateName ] = substate;
                
                controller = this.controller();
                controller.root() === this && ( controller[ stateName ] = substate );
                
                return substate;
            };
        },

        // #### removeSubstate
        // 
        // Removes the named substate from the local state, if possible.
        removeSubstate: function ( substates ) {
            return function ( /*String*/ stateName ) {
                var controller, current, transition,
                    substate = substates[ stateName ];

                if ( !substate ) return;

                controller = this.controller();
                current = controller.current();

                // If a transition is underway involving `substate`, the removal will fail.
                if (
                    ( transition = controller.transition() )
                        &&
                    (
                        substate.isSuperstateOf( transition ) ||
                        substate === transition.origin() ||
                        substate === transition.target()
                    )
                ) {
                    return false;
                }

                // The controller must be forced to evacuate the state before it is removed.
                current.isIn( substate ) && controller.change( this, { forced: true } );

                delete substates[ stateName ];
                delete this[ stateName ];
                controller.root() === this && delete controller[ stateName ];

                return substate;
            };
        },

        // #### transition
        // 
        // Returns the named transition definition held on this state.
        transition: function ( transitions ) {
            return function ( /*String*/ transitionName ) {
                return transitions[ transitionName ];
            };
        },

        // #### transitions
        // 
        // Returns an object containing all the transition definitions held on this state.
        transitions: function ( transitions ) {
            return function () {
                return Z.clone( transitions );
            };
        },

        // #### addTransition
        // 
        // Registers a transition definition to this state.
        addTransition: function ( transitions ) {
            return function (
                /*String*/ transitionName,
                /*TransitionDefinition | Object*/ transitionDefinition
            ) {
                if ( this.isVirtual() ) {
                    return this.reify().addTransition( transitionName, transitionDefinition );
                }

                transitionDefinition instanceof TransitionDefinition ||
                    ( transitionDefinition = TransitionDefinition( transitionDefinition ) );
                
                return transitions[ transitionName ] = transitionDefinition;
            };
        },

        // #### history
        // 
        history: function ( history ) {
            return function () {
                return Z.clone( history );
            };
        },

        // #### push
        // 
        push: function ( history ) {
            return function ( flags, state, data ) {
                var i, previous, current;

                if ( !state.isIn( this ) ) return;

                typeof flags === 'string' || ( data = state, state = flags, flags = undefined );
                flags = Z.assign( flags );

                i = history.index;
                previous = i === undefined ? null : history[i];

                i = history.index = i === undefined ? 0 : i + 1;
                current = history[i] = {
                    state: state.toString(),
                    data: undefined
                };

                if ( flags.relative ) {
                    if ( previous ) {
                        current.data = previous.data;
                        previous.data = Z.delta( current.data, data );
                    } else {
                        current.data = Z.clone( data );
                    }
                } else {
                    current.data = Z.clone( data );
                    previous && ( previous.data = Z.diff( previous.data, data ) );
                }

                history.splice( ++i, history.length - i );

                0 && this.goTo( state );

                return history.length;
            };
        },

        // #### replace
        // 
        replace: function ( history ) {
            return function ( flags, state, data ) {
                var previous, current, next, delta,
                    i = history.index,
                    l = history.length;

                if ( i === undefined ) {
                    this.push.apply( this, arguments );
                    return this;
                }

                if ( !state.isIn( this ) ) return;

                typeof flags === 'string' || ( data = state, state = flags, flags = undefined );
                flags = Z.assign( flags );

                current = history[i];
                i > 0 && ( previous = history[ i - 1 ] );
                i < l - 1 && ( next = history[ i + 1 ] );

                current.state = state.toString();
                delta = ( flags.relative ? Z.delta : Z.diff )( current.data, data );
                if ( !Z.isEmpty( delta ) ) {
                    previous && Z.extend( true, previous.data, delta );
                    next && Z.extend( true, next.data, delta );
                }
                current.data = Z.clone( data );

                0 && this.goTo( state );

                return this;
            };
        },

        // #### destroy
        // 
        // Attempts to cleanly destroy this state and all of its substates. A `destroy` event is
        // issued to each state after it is destroyed.
        destroy: function ( setSuperstate, methods, events, substates ) {
            return function () {
                var superstate = this.superstate(),
                    controller = this.controller(),
                    owner = controller.owner(),
                    transition = controller.transition(),
                    origin, target, key, methodName, delegator, method, stateName;
        
                // If a transition is underway that involves this state, then the state cannot be
                // destroyed.
                if ( transition ) {
                    origin = transition.origin(), target = transition.target();

                    if ( this === origin || this.isSuperstateOf( origin )  ||
                            this === target || this.isSuperstateOf( target ) ) {
                        return false;
                    }
                }

                // Emit a `destroy` event on the local state.
                this.emit( 'destroy', false );
                for ( key in events ) {
                    events[ key ].destroy();
                    delete events[ key ];
                }

                if ( superstate ) {
                    superstate.removeSubstate( this.name() );
                }
                // This is the root state, so restore any original methods to the owner and
                // delete any delegators.
                else {
                    for ( methodName in methods ) {
                        delegator = owner[ methodName ];
                        method = delegator.original;
                        if ( method ) {
                            delete delegator.original;
                            owner[ methodName ] = method;
                        } else {
                            delete owner[ methodName ];
                        }
                    }
                }
                for ( stateName in substates ) if ( Z.hasOwn.call( substates, stateName ) ) {
                    substates[ stateName ].destroy();
                }
                setSuperstate( undefined );

                return true;
            };
        }
    };

    // ### Prototype methods
    // 
    // Entries for instance and privileged methods defined above are also included here as no-ops
    // or defaults, so as to provide virtual states with a conformant `State` interface despite
    // not (yet) having been reified.
    Z.assign( State.prototype, {
        attributes: Z.thunk( SA.NORMAL ),
        isVirtual:   function () { return !!( this.attributes() & SA.VIRTUAL ); },
        isInitial:   function () { return !!( this.attributes() & SA.INITIAL ); },
        isDefault:   function () { return !!( this.attributes() & SA.DEFAULT ); },
        isFinal:     function () { return !!( this.attributes() & SA.FINAL ); },
        isAbstract:  function () { return !!( this.attributes() & SA.ABSTRACT ); },
        isSealed:    function () { return !!( this.attributes() & SA.SEALED ); },
        isRetained:  function () { return !!( this.attributes() & SA.RETAINED ); },
        hasHistory:  function () { return !!( this.attributes() & SA.HISTORY ); },
        isShallow:   function () { return !!( this.attributes() & SA.SHALLOW ); },
        isVersioned: function () { return !!( this.attributes() & SA.VERSIONED ); },
        isRegioned:  function () { return !!( this.attributes() & SA.REGIONED ); },

        'name \
         superstate \
         removeMethod \
         event removeEvent emit trigger \
         guard removeGuard \
         removeSubstate \
         transition removeTransition' :
            Z.noop,
        
        'reify data': Z.getThis,
        'methodNames substates': function () { return []; },
        transitions: function () { return {}; },
        destroy: Z.thunk( false )
    });
    Z.privilege( State.prototype, State.privileged, {
        'data \
         method addMethod \
         addEvent \
         addGuard \
         substate addSubstate \
         addTransition' :
            [ null ]
    });
    Z.alias( State.prototype, { addEvent: 'on bind', removeEvent: 'off unbind' } );
    Z.assign( State.prototype, {

        // #### toString
        // 
        // Returns this state’s fully qualified name.
        toString: function () {
            return this.derivation( true ).join('.');
        },
        
        // #### controller
        // 
        // Gets the `StateController` to which this state belongs.
        controller: function () {
            var superstate = this.superstate();
            if ( superstate ) {
                return superstate.controller();
            }
        },
        
        // #### owner
        // 
        // Gets the owner object to which this state’s controller belongs.
        owner: function () {
            var controller = this.controller();
            if ( controller ) {
                return controller.owner();
            }
        },
        
        // #### root
        // 
        // Gets the root state, i.e. the top-level superstate of this state.
        root: function () {
            var controller = this.controller();
            if ( controller ) {
                return controller.root();
            }
        },
        
        // #### defaultSubstate
        // 
        // Returns the first substate marked `default`, or simply the first substate.
        defaultSubstate: function () {
            var substates = this.substates(), i = 0, l = substates && substates.length;
            if ( !l ) return;
            for ( ; i < l; i++ ) {
                if ( substates[i].isDefault() ) {
                    return substates[i];
                }
            }
            return substates[0];
        },

        // #### initialSubstate
        // 
        // Performs a “depth-within-breadth-first” recursive search to locate the most deeply
        // nested `initial` state by way of the greatest `initial` descendant state. Recursion
        // continues into the protostate only if no local descendant states are marked `initial`.
        initialSubstate: function (
            /*Boolean*/ viaProto // = true
        ) {
            var queue = [ this ],
                subject, substates, i, l, s, p;
            
            while ( subject = queue.shift() ) {
                substates = subject.substates();
                for ( i = 0, l = substates.length; i < l; i++ ) {
                    s = substates[i];
                    if ( s.isInitial() ) {
                        return s.initialSubstate( false ) || s;
                    }
                    queue.push( s );
                }
            }

            if ( ( viaProto || viaProto === undefined ) && ( p = this.protostate() ) ) {
                return p.initialSubstate( true );
            }
        },

        // #### protostate
        // 
        // Returns the **protostate**, the state analogous to `this` found in the next object in the
        // owner’s prototype chain that has one. A state inherits from both its protostate and
        // superstate, *in that order*.
        // 
        // If the owner does not share an analogous `StateController` with its prototype, or if no
        // protostate can be found in the hierarchy of the prototype’s state controller, then the
        // search is iterated up the prototype chain.
        // 
        // A state and its protostate will always share an identical name and identical derivation
        // pattern, as will the respective superstates of both, relative to one another.
        protostate: function () {
            var derivation = this.derivation( true ),
                controller = this.controller(),
                controllerName, owner, prototype, protostate, i, l, stateName;
            
            function iterate () {
                var fn, c;
                prototype = Z.getPrototypeOf( prototype );
                protostate = prototype &&
                    typeof prototype === 'object' &&
                    Z.isFunction( fn = prototype[ controllerName ] ) &&
                    ( c = fn.apply( prototype ) ) &&
                    c instanceof State ?
                        c.root() :
                        null;
            }
            
            if ( !controller ) return;

            controllerName = controller.name();
            prototype = owner = controller.owner();
        
            for ( iterate(); protostate; iterate() ) {
                for ( i = 0, l = derivation.length; i < l; i++ ) {
                    protostate = protostate.substate( derivation[i], false );
                    if ( !protostate ) return;
                }
                return protostate;
            }
        },

        // #### derivation
        // 
        // Returns an object array of this state’s superstate chain, starting after the root
        // state and ending at `this`. If `byName` is set to `true`, a string array of the
        // states’ names is returned instead.
        derivation: function ( /*Boolean*/ byName ) {
            for ( var result = [], state, superstate = this;
                    ( state = superstate ) && ( superstate = state.superstate() );
                    result.unshift( byName ? state.name() || '' : state ) );
            return result;
        },

        // #### depth
        // 
        // Returns the number of superstates this state has. The root state returns `0`, its
        // immediate substates return `1`, etc.
        depth: function () {
            for ( var count = 0, state = this, superstate;
                    superstate = state.superstate();
                    count++, state = superstate );
            return count;
        },

        // #### common
        // 
        // Returns the least common ancestor of `this` and `other`. If `this` is itself an ancestor
        // of `other`, or vice versa, that ancestor is returned.
        common: function ( /*State | String*/ other ) {
            var state;
            other instanceof State || ( other = this.match( other ) );
            for (
                this.depth() > other.depth() ?
                    ( state = other, other = this ) :
                    ( state = this );
                state;
                state = state.superstate() 
            ) {
                if ( state === other || state.isSuperstateOf( other ) ) {
                    return state;
                }
            }
        },
        
        // #### is
        // 
        // Determines whether `this` is `state`.
        is: function ( /*State | String*/ state ) {
            state instanceof State || ( state = this.match( state ) );
            return state === this;
        },

        // #### isIn
        // 
        // Determines whether `this` is or is a substate of `state`.
        isIn: function ( /*State | String*/ state ) {
            state instanceof State || ( state = this.match( state ) );
            return state === this || state.isSuperstateOf( this );
        },
        
        // #### isSuperstateOf
        // 
        // Determines whether `this` is a superstate of `state`.
        isSuperstateOf: function ( /*State | String*/ state ) {
            var superstate;
            state instanceof State || ( state = this.match( state ) );
            
            return ( superstate = state.superstate() ) ?
                this === superstate || this.isSuperstateOf( superstate )
                :
                false;
        },

        // #### isProtostateOf
        // 
        // Determines whether `this` is a state analogous to `state` on any object in the prototype
        // chain of `state`’s owner.
        isProtostateOf: function ( /*State | String*/ state ) {
            var protostate;
            state instanceof State || ( state = this.match( state ) );

            return ( protostate = state.protostate() ) ?
                this === protostate || this.isProtostateOf( protostate )
                :
                false;
        },

        // #### apply
        // 
        // Finds a state method and applies it in the appropriate context. If the method was
        // originally defined in the owner, the context will be the owner. Otherwise, the context
        // will either be the state in which the method is defined, or if the implementation
        // resides in a protostate, the corresponding virtual state in the calling controller.
        apply: function ( /*String*/ methodName, /*Array*/ args ) {
            var owner, ownerMethod,
                out = { method: undefined, context: undefined },
                method = this.method( methodName, true, true, out ),
                context = out.context;
            
            if ( !method ) throw new TypeError( "State '" + this + "' cannot resolve method '" +
                methodName + "'" );

            owner = this.owner();
            ownerMethod = owner[ methodName ];
            if ( ownerMethod && ownerMethod.original && context === this.root() ) {
                context = owner;
            }

            return method.apply( context, args );
        },
        
        // #### call
        // 
        // Variadic `apply`.
        call: function ( /*String*/ methodName ) {
            return this.apply( methodName, Z.slice.call( arguments, 1 ) );
        },
        
        // #### hasMethod
        // 
        // Determines whether `this` possesses or inherits a method named `methodName`.
        hasMethod: function ( /*String*/ methodName ) {
            var method = this.method( methodName );
            return method && method !== Z.noop;
        },
        
        // #### hasOwnMethod
        // 
        // Determines whether `this` directly possesses a method named `methodName`.
        hasOwnMethod: function ( /*String*/ methodName ) {
            return !!this.method( methodName, false, false );
        },

        // #### change
        // 
        // Forwards a `change` command to the state’s controller and returns its result.
        // 
        // *Aliases:* **be**, **become**, **go**, **goTo**
        'change be become go goTo': function () {
            var controller = this.controller();
            return controller.change.apply( controller, arguments );
        },
        
        // #### select
        // 
        // Tells the controller to change to this or the specified `state` and returns the targeted
        // state.
        select: function ( /*State | String*/ state ) {
            state === undefined ?
                ( state = this ) :
                state instanceof State || ( state = this.match( state ) );
            return this.controller().change( state ) && state;
        },

        // #### isCurrent
        // 
        // Returns a `Boolean` indicating whether `this` is the controller’s current state.
        isCurrent: function () {
            return this.controller().current() === this;
        },
        
        // #### isActive
        // 
        // Returns a `Boolean` indicating whether `this` or one of its substates is the
        // controller’s current state.
        isActive: function () {
            var current = this.controller().current();
            return current === this || this.isSuperstateOf( current );
        },
        
        // #### history
        // 
        history: function () {
            var h = this.historian();
            if ( h ) return h.history();
        },

        // #### historian
        // 
        // Returns the nearest history-keeping state.
        historian: function () {
            for ( var s = this; s; s = s.superstate() ) if ( s.hasHistory() ) return s;
        },

        push: function ( state ) {
            var historian = this.historian();

            if ( historian ) {
                // Before delegating to the historian, `state` must be resolved locally.
                state instanceof State || ( state = this.match( state ) );

                if ( state && state.isIn( this ) ) return historian.push( state );
            }
        },

        replace: function ( state ) {
            var historian = this.historian();

            if ( historian ) {
                // Before delegating to the historian, `state` must be resolved locally.
                state instanceof State || ( state = this.match( state ) );

                if ( state && state.isIn( this ) ) return historian.push( state );
            }
        },

        /** */
        pushHistory: global.history && global.history.pushState ?
            function ( title, urlBase ) {
                return global.history.pushState( this.data, title || this.toString(),
                    urlBase + '/' + this.derivation( true ).join('/') );
            } : Z.noop
        ,
        
        /** */
        replaceHistory: global.history && global.history.replaceState ?
            function ( title, urlBase ) {
                return global.history.replaceState( this.data, title || this.toString(),
                    urlBase + '/' + this.derivation( true ).join('/') );
            } : Z.noop
        ,

        // #### evaluateGuard
        // 
        // Returns the Boolean result of the guard function at `guardName` defined on this state, as
        // evaluated against `testState`, or `true` if no guard exists.
        evaluateGuard: function (
            /*String*/ guardName,
             /*State*/ testState   // optional
        ) {
            var state = this,
                guard = this.guard( guardName ),
                result;
            
            if ( guard ) {
                Z.each( guard, function ( selector, value ) {
                    Z.each( selector.split(','), function ( i, expr ) {
                        if ( state.match( Z.trim( expr ), testState ) ) {
                            result = !!( typeof value === 'function' ?
                                value.apply( state, [ testState ] ) :
                                value );
                            return false; 
                        }
                    });
                    return result === undefined;
                });
            }

            return result === undefined || result;
        },

        // #### match
        // 
        // Matches a string expression `expr` with the state or states it represents, evaluated in
        // the context of `this`.
        // 
        // Returns the matched `State`, an `Array` containing the set of matched states, or a
        // `Boolean` indicating whether `testState` is a match or is included in the matched set.
        match: function (
            /*String*/ expr,
             /*State*/ testState // optional
        ) {
            var parts = expr && expr.split('.'),
                cursor = parts && parts.length && parts[0] === '' ?
                    ( parts.shift(), this ) :
                    this.root(),
                cursorSubstate, result, i, l, name;
            
            if ( !( parts && parts.length ) ) return cursor;

            for ( i = 0, l = parts.length; i < l; i++ ) {
                name = parts[i];
                if ( name === '' ) {
                    cursor = cursor.superstate();
                } else if ( cursorSubstate = cursor.substate( name ) ) {
                    cursor = cursorSubstate;
                } else if ( name === '*' ) {
                    result = testState ?
                        cursor === testState.superstate() :
                        cursor.substates();
                    break;
                } else if ( name === '**' ) {
                    result = testState ?
                        cursor.isSuperstateOf( testState ) :
                        cursor.substates( true );
                    break;
                } else {
                    result = false;
                    break;
                }
            }

            return result !== undefined ? result :
                !testState || cursor === testState ? cursor :
                false;
        }
    });

    return State;
})();


// <a id="state-definition" />

// ## StateDefinition
// 
// A state **definition** is a formalization of a state’s contents. States are declared by calling
// the module’s exported `state()` function and passing it an object map containing the definition.
// This input may be expressed in a shorthand format, which the `StateDefinition` constructor
// rewrites into unambiguous long form, which can be used later to create `State` instances.

var StateDefinition = ( function () {
    var attributeMap   = Z.forEach( Z.assign( STATE_ATTRIBUTE_MODIFIERS ),
            function ( value, key, object ) { object[ key ] = key.toUpperCase(); }),
        categoryMap    = Z.assign( STATE_DEFINITION_CATEGORIES ),
        eventTypes     = Z.assign( STATE_EVENT_TYPES ),
        guardActions   = Z.assign( GUARD_ACTIONS );

    // ### Constructor
    function StateDefinition (
        /*String | Object*/ attributes, // optional
                 /*Object*/ map
    ) {
        if ( !( this instanceof StateDefinition ) ) {
            return new StateDefinition( attributes, map );
        }

        typeof attributes === 'string' ?
            map || ( map = {} ) :
            map || ( map = attributes, attributes = undefined );
        
        Z.extend( true, this, map instanceof StateDefinition ? map : interpret( map ) );

        attributes == null ?
            map && ( attributes = map.attributes ) :
            Z.isNumber( attributes ) || ( attributes = encodeAttributes( attributes ) );

        this.attributes = attributes || STATE_ATTRIBUTES.NORMAL;
    }

    // ### Static functions

    // #### encodeAttributes
    // 
    // Transforms the provided set of attributes into a bit field integer.
    function encodeAttributes ( /*Object | String*/ attributes ) {
        var key,
            result = STATE_ATTRIBUTES.NORMAL;

        typeof attributes === 'string' && ( attributes = Z.assign( attributes ) );

        for ( key in attributes ) {
            if ( Z.hasOwn.call( attributes, key ) && key in attributeMap ) {
                result |= STATE_ATTRIBUTES[ attributeMap[ key ] ];
            }
        }

        return result;
    }

    // #### interpret
    // 
    // Transforms a plain object map into a well-formed `StateDefinition`, making the appropriate
    // inferences for any shorthand notation encountered.
    function interpret ( /*Object*/ map ) {
        var key, value, object, category,
            result = Z.assign( STATE_DEFINITION_CATEGORIES, null );
        
        for ( key in map ) if ( Z.hasOwn.call( map, key ) ) {
            value = map[ key ];
            
            // **Priority 1:** Do a nominative type match for explicit definition instances.
            category =
                value instanceof StateDefinition && 'states' ||
                value instanceof TransitionDefinition && 'transitions';
            if ( category ) {
                ( result[ category ] || ( result[ category ] = {} ) )[ key ] = value;
            }
            
            // **Priority 2:** Recognize an explicitly named category object.
            else if ( key in result ) {
                result[ key ] = Z.extend( result[ key ], value );
            }
            
            // **Priority 3:** Use keys and value types to infer implicit categorization.
            else {
                category =
                    key in eventTypes ? 'events' :
                    key in guardActions ? 'guards' :
                    Z.isPlainObject( value ) ? 'states' :
                    'methods';
                ( result[ category ] || ( result[ category ] = {} ) )[ key ] = value;
            }
        }
        
        object = result.events;
        for ( key in object ) if ( Z.hasOwn.call( object, key ) ) {
            Z.isFunction( value = object[ key ] ) && ( object[ key ] = [ value ] );
        }
        
        object = result.transitions;
        for ( key in object ) if ( Z.hasOwn.call( object, key ) ) {
            ( value = object[ key ] ) instanceof TransitionDefinition ||
                ( object[ key ] = new TransitionDefinition( value ) );
        }
        
        object = result.states;
        for ( key in object ) if ( Z.hasOwn.call( object, key ) ) {
            ( value = object[ key ] ) instanceof StateDefinition ||
                ( object[ key ] = new StateDefinition( value ) );
        }
        
        return result;
    }

    return StateDefinition;
})();


// <a id="state-controller" />

// ## StateController
// 
// A state **controller** is the mediator between an owner object and its implementation of state.
// The controller maintains the identity of the owner’s active state, and facilitates transitions
// from one state to another. It provides the behavior-modeling aspect of the owner’s state by
// forwarding method calls made on the owner to any associated stateful implementations of those
// methods that are valid given the current state.

var StateController = ( function () {

    // ### Constructor
    function StateController (
                          /*Object*/ owner,      // = {}
        /*StateDefinition | Object*/ definition, // optional
                          /*Object*/ options     // optional
    ) {
        if ( !( this instanceof StateController ) ) {
            return new StateController( owner, definition, options );
        }
        
        var self = this,
            name, root, current, transition,
            defaultSubstate;
        
        function setCurrent ( value ) { return current = value; }
        function setTransition ( value ) { return transition = value; }
        
        // Validate arguments.
        owner || ( owner = {} );
        definition instanceof StateDefinition ||
            ( definition = new StateDefinition( definition ) );
        options === undefined && ( options = {} ) ||
            typeof options === 'string' && ( options = { initialState: options } );
        
        // Assign a function to the owner that will serve as its interface into its state.
        name = options.name || 'state';
        owner[ name ] = createAccessor( owner, name, this );
        
        // ### Internal privileged methods
        Z.assign( this, {
            // #### owner
            // 
            // Returns the owner object on whose behalf this controller acts.
            owner: function () { return owner; },

            // #### name
            // 
            // Returns the name assigned to this controller. This is also the key in `owner` that
            // holds the `accessor` function associated with this controller.
            name: Z.stringFunction( function () { return name; } ),

            // #### root
            // 
            // Returns the root state.
            root: function () { return root; },

            // #### current
            // 
            // Returns the controller’s current state, or currently active transition.
            current: Z.assign( function () { return current; }, {
                toString: function () { return current ? current.toString() : undefined; }
            }),

            // #### transition
            // 
            // Returns the currently active transition, or `undefined` if the controller is not
            // presently engaged in a transition.
            transition: Z.assign( function () { return transition; }, {
                toString: function () { return transition ? transition.toString() : ''; }
            })
        });
        
        // Assign partially applied external privileged methods.
        Z.privilege( this, StateController.privileged, {
            'change' : [ setCurrent, setTransition ]
        });
        
        // Instantiate the root state, adding a redefinition of the `controller` method that points
        // directly to this controller, along with all of the members and substates outlined in
        // `definition`.
        root = new State( undefined, undefined, definition );
        root.controller = function () { return self; };
        root.init( definition );
        
        // Establish which state should be the initial state and set the current state to that.
        current = root.initialSubstate() || root;
        options.initialState !== undefined && ( current = root.match( options.initialState ) );
        current.isAbstract() && ( defaultSubstate = current.defaultSubstate() ) &&
            ( current = defaultSubstate );
        current.controller() === this || ( current = virtualize.call( this, current ) );

        // (Exposed for debugging.)
        Z.env.debug && Z.assign( this.__private__ = {}, {
            root: root,
            owner: owner,
            options: options
        });
    }

    // ### Static functions

    // #### createAccessor
    // 
    // Returns an `accessor` function, which will serve as an owner object’s interface to the
    // implementation of its state.
    function createAccessor ( owner, name, self ) {
        function accessor () {
            var current, controller, root, key, method,
                fn = arguments[0];

            if ( this === owner ) {
                current = self.current();
                if ( Z.isFunction( fn ) ) {
                    return self.change.call( current, fn.call( this ) );
                }
                return arguments.length ? current.match.apply( current, arguments ) : current;
            }

            // Calling the accessor of a prototype means that `this` requires its own accessor
            // and `StateController`.
            else if (
                Object.prototype.isPrototypeOf.call( owner, this ) &&
                !Z.hasOwn( this, name )
            ) {
                controller = new StateController( this, null, {
                    name: name,
                    initialState: self.current().toString()
                });
                root = controller.root();

                // Any methods of `this` that have stateful implementations located higher in the
                // prototype chain must be copied into the root state to be used as defaults.
                for ( key in this ) if ( Z.hasOwn.call( this, key ) ) {
                    method = this[ key ];
                    if ( Z.isFunction( method ) && root.method( key, false ) ) {
                        root.addMethod( key, method );
                    }
                }

                return this[ name ].apply( this, arguments );
            }
        }
        return accessor;
    }

    // #### virtualize
    // 
    // Creates a transient virtual state within the local state hierarchy to represent
    // `protostate`, along with as many virtual superstates as are necessary to reach a real
    // `State` in the local hierarchy.
    function virtualize ( protostate ) {
        var derivation, state, next, name;
        function iterate () {
            return next = state.substate( ( name = derivation.shift() ), false );
        }
        if ( protostate instanceof State &&
            protostate.owner().isPrototypeOf( this.owner() ) &&
            ( derivation = protostate.derivation( true ) ).length
        ) {
            for ( state = this.root(), iterate(); next; state = next, iterate() );
            while ( name ) {
                state = new State( state, name, { attributes: STATE_ATTRIBUTES.VIRTUAL } );
                name = derivation.shift();
            }
            return state;
        }
    }
    
    // #### annihilate
    // 
    // Destroys the given `virtualState` and all of its virtual superstates.
    function annihilate ( virtualState ) {
        var superstate;
        while ( virtualState.isVirtual() ) {
            superstate = virtualState.superstate();
            virtualState.destroy();
            virtualState = superstate;
        }
    }
    
    // ### External privileged methods

    StateController.privileged = {

        // #### change
        // 
        // Attempts to execute a state transition. Handles asynchronous transitions, generation of
        // appropriate events, and construction of any necessary temporary virtual states. Respects
        // guards supplied in both the origin and `target` states. Fails by returning `false` if
        // the transition is disallowed.
        // 
        // The `target` parameter may be either a `State` object that is part of this controller’s
        // state hierarchy, or a string that resolves to a likewise targetable `State` when
        // evaluated from the context of the most recently current state.
        // 
        // The `options` parameter is an optional map that may include:
        // 
        // * `forced` : `Boolean` — overrides any guards defined, ensuring the change will
        //   complete, assuming a valid target.
        // * `success` : `Function` — callback to be executed upon successful completion of the
        //   transition.
        // * `failure` : `Function` — callback to be executed if the transition attempt is blocked
        //   by a guard.
        change: function ( setCurrent, setTransition ) {
            var reentrant = true;

            function push () {
                reentrant = false;
                this.push.apply( this, arguments );
                reentrant = true;
            }

            return function (
                /*State | String*/ target,
                        /*Object*/ options // optional
            ) {
                if ( !reentrant ) return;

                var owner, transition, targetOwner, source, origin, domain, info, state,
                    transitionDefinition,
                    self = this;

                owner = this.owner();
                transition = this.transition();

                // The `origin` is defined as the controller’s most recently current state that is
                // not a `Transition`.
                origin = transition ? transition.origin() : this.current();

                // Departures are not allowed from a state that is `final`.
                if ( origin.isFinal() ) return null;

                // Resolve `target` argument to a proper `State` object if necessary.
                target instanceof State ||
                    ( target = target ? origin.match( target ) : this.root() );
            
                if ( !( target instanceof State ) ||
                        ( targetOwner = target.owner() ) !== owner &&
                        !targetOwner.isPrototypeOf( owner )
                ) {
                    return null;
                }

                // A transition cannot target an abstract state directly, so `target` will be
                // reassigned to the appropriate concrete substate.
                while ( target.isAbstract() ) {
                    target = target.defaultSubstate();
                    if ( !target ) return null;
                }
                
                options || ( options = {} );

                // If any guards are in place for the given `origin` and `target` states, they must
                // consent to the transition, unless we specify that it be `forced`.
                if ( !options.forced && (
                        !origin.evaluateGuard( 'release', target ) ||
                        !target.evaluateGuard( 'admit', origin )
                ) ) {
                    typeof options.failure === 'function' && options.failure.call( this );
                    return null;
                }


                // If `target` is a state from a prototype of `owner`, it must be represented
                // here as a transient virtual state.
                target && target.controller() !== this &&
                    ( target = virtualize.call( this, target ) );
                
                // If a previously initiated transition is still underway, it needs to be
                // notified that it won’t finish.
                transition && transition.abort();
                
                // The `source` variable will reference the previously current state (or abortive
                // transition).
                source = state = this.current();

                // The upcoming transition will start from its `source` and proceed within the
                // `domain` of the least common ancestor between that state and the specified
                // target.
                domain = source.common( target );
                
                // Retrieve the appropriate transition definition for this origin/target pairing;
                // if none is defined, then an actionless default transition will cause the
                // callback to return immediately.
                transitionDefinition = this.getTransitionDefinitionFor( target, origin );
                transition = setTransition( new Transition( target, source,
                    transitionDefinition ));
                info = { transition: transition, forced: !!options.forced };
                
                // Preparation for the transition begins by emitting a `depart` event on the
                // `source` state.
                source.emit( 'depart', info, false );

                // Enter into the transition state.
                setCurrent( transition );
                transition.emit( 'enter', false );
                
                // Walk up to the top of the domain, emitting `exit` events for each state
                // along the way.
                while ( state !== domain ) {
                    state.emit( 'exit', info, false );
                    transition.attachTo( state = state.superstate() );
                }
                
                // Provide an enclosed callback that will be called from `transition.end()` to
                // conclude the transition.
                transition.setCallback( function () {
                    var pathToState = [],
                        state, substate, superstate;
                    
                    // Trace a path from `target` up to `domain`, then walk down it, emitting
                    // `enter` events for each state along the way.
                    for ( state = target; state !== domain; state = state.superstate() ) {
                        pathToState.push( state );
                    }
                    for ( state = domain; substate = pathToState.pop(); state = substate ) {
                        if ( state.isShallow() ) {
                            state.hasHistory() && push.call( state, substate );
                        }
                        transition.attachTo( substate );
                        substate.emit( 'enter', info, false );
                    }

                    // Exit from the transition state.
                    transition.emit( 'exit', false );
                    setCurrent( target );

                    // Terminate the transition with an `arrive` event on the targeted state.
                    target.emit( 'arrive', info, false );
                    
                    // For each state from `target` to `root` that records a deep history, push a
                    // new element that points to `target`.
                    for ( state = target; state; state = superstate ) {
                        superstate = state.superstate();
                        if ( !state.isShallow() ) {
                            state.hasHistory() && push.call( state, target );
                        }
                    }

                    // Any virtual states that were previously active are no longer needed.
                    if ( origin.isVirtual() ) {
                        annihilate.call( this, origin );
                        origin = null;
                    }

                    // Now complete, the `Transition` instance can be discarded.
                    transition.destroy();
                    transition = setTransition( null );
                    
                    typeof options.success === 'function' && options.success.call( this );

                    return target;
                });
                
                // At this point the transition is attached to the `domain` state and is ready
                // to proceed.
                return transition.start.apply( transition, options.arguments ) || target;
            }
        }
    };
    
    // ### Prototype methods

    Z.assign( StateController.prototype, {

        // #### toString
        // 
        toString: function () {
            return this.current().toString();
        },

        // #### getTransitionDefinitionFor
        // 
        // Finds the appropriate transition definition for the given origin and target states. If
        // no matching transitions are defined in any of the states, returns a generic actionless
        // transition definition for the origin/target pair.
        getTransitionDefinitionFor: function ( target, origin ) {
            origin || ( origin = this.current() );
            
            function search ( state, until ) {
                var result;
                for ( ; state && state !== until; state = until ? state.superstate() : undefined ) {
                    Z.each( state.transitions(), function ( i, definition ) {
                        return !(
                            ( definition.target ?
                                state.match( definition.target, target ) :
                                state === target )
                                    &&
                            ( !definition.origin || state.match( definition.origin, origin ) ) &&
                        ( result = definition ) );
                    });
                }
                return result;
            }
            
            // Search order:
            // 1. `target`,
            // 2. `origin`,
            // 3. superstates of `target`,
            // 4. superstates of `origin`.
            return (
                search( target ) ||
                origin !== target && search( origin ) ||
                search( target.superstate(), this.root() ) ||
                    search( this.root() ) ||
                !target.isIn( origin ) && search( origin.superstate(), origin.common( target ) ) ||
                new TransitionDefinition
            );
        },
        
        // #### destroy
        // 
        // Destroys this controller and all of its states, and returns the owner to its original
        // condition.
        destroy: function () {
            return this.root().destroy() && delete this.owner()[ this.name() ];
        }
    });

    return StateController;
})();

// <a id="state-event" />

// ## StateEvent
// 
// When an event is emitted from a state, it passes a `StateEvent` object to any bound listeners,
// containing the `type` string and a reference to the contextual `state`.

var StateEvent = ( function () {

    // ### Constructor
    function StateEvent ( state, type ) {
        Z.assign( this, {
            target: state,
            name: state.toString(),
            type: type
        });
    }

    StateEvent.prototype.toString = function () {
        return 'StateEvent (' + this.type + ') ' + this.name;
    };
    
    return StateEvent;
})();

// <a id="state-event-collection" />

// ## StateEventCollection
// 
// A state holds event listeners for each of its various event types in a `StateEventCollection`
// instance.

var StateEventCollection = ( function () {
    var guid = 0;

    // ### Constructor
    function StateEventCollection ( state, type ) {
        this.state = state;
        this.type = type;
        this.items = {};
        this.length = 0;
    }

    Z.assign( StateEventCollection.prototype, {
        // #### guid
        // 
        // Produces a unique numeric string, to be used as a key for bound event listeners.
        guid: function () {
            return ( ++guid ).toString();
        },

        // #### get
        // 
        // Retrieves a bound listener associated with the provided `id` string as returned by
        // the prior call to `add`.
        get: function ( id ) {
            return this.items[id];
        },

        // #### key
        // 
        // Retrieves the `id` string associated with the provided listener.
        key: function ( listener ) {
            var i, items = this.items;
            for ( i in items ) if ( Z.hasOwn.call( items, i ) ) {
                if ( items[i] === listener ) return i;
            }
        },

        // #### keys
        // 
        // Returns the set of `id` strings associated with all bound listeners.
        keys: function () {
            var i, items = this.items, result = [];

            result.toString = function () { return '[' + result.join() + ']'; };
            for ( i in items ) if ( Z.hasOwn.call( items, i ) ) {
                result.push( items[i] );
            }
            return result;
        },

        // #### add
        // 
        // Binds a listener, along with an optional context object, to be called when the
        // the collection `emit`s an event. Returns a unique key that can be used later to
        // `remove` the listener.
        // 
        // *Aliases:* **on bind**
        add: function (
            /*Function*/ fn,
              /*Object*/ context  // optional
        ) {
            var id = this.guid();
            this.items[id] = typeof context === 'object' ? [ fn, context ] : fn;
            this.length++;
            return id;
        },

        // #### remove
        // 
        // Unbinds a listener. Accepts either the numeric string returned by `add` or a reference
        // to the function itself.
        // 
        // *Aliases:* **off unbind**
        remove: function ( /*Function | String*/ id ) {
            var fn, i, l,
                items = this.items;
            
            fn = items[ typeof id === 'function' ? this.key( id ) : id ];
            if ( !fn ) return false;
            delete items[id];
            this.length--;
            return fn;
        },

        // #### empty
        empty: function () {
            var i, items = this.items;

            if ( !this.length ) return false;

            for ( i in items ) if ( Z.hasOwn.call( items, i ) ) delete items[i];
            this.length = 0;
            return true;
        },

        // #### emit
        // 
        // Creates a `StateEvent` and begins propagation of it through all bound listeners.
        // 
        // *Alias:* **trigger**
        emit: function ( args, state ) {
            var i, item, fn, context,
                items = this.items, type = this.type;
            
            state || ( state = this.state );

            for ( i in items ) if ( Z.hasOwn.call( items, i ) ) {
                item = items[i];
                
                if ( typeof item === 'function' ) {
                    fn = item, context = state;
                } else if ( Z.isArray( item ) ) {
                    fn = item[0], context = item[1];
                }

                args.unshift( new StateEvent( state, type ) );
                fn && fn.apply( context, args );
            }
        },

        // #### destroy
        destroy: function () {
            this.empty();
            delete this.state, delete this.type, delete this.items, delete this.length;
            return true;
        }
    });
    Z.alias( StateEventCollection.prototype, {
        add: 'on bind',
        remove: 'off unbind',
        emit: 'trigger'
    });

    return StateEventCollection;
})();


// ## Transition
// 
// A **transition** is a transient `State` adopted by a controller as it changes from one of its
// proper `State`s to another.
// 
// A transition acts within the **domain** of the *least common ancestor* to its **origin** and
// **target** states. During this time it behaves much as if it were a substate of that domain
// state, inheriting method calls and propagating events in the familiar fashion.

var Transition = ( function () {
    Z.inherit( Transition, State );

    // ### Constructor
    function Transition ( target, source, definition, callback ) {
        if ( !( this instanceof Transition ) ) {
            return TransitionDefinition.apply( this, arguments );
        }
        
        var self = this,
            methods = {},
            events = {},

            // The **action** of a transition is a function that will be called after the
            // transition has been `start`ed. This function, if provided, is responsible for
            // calling `end()` on the transition at some point in the future.
            action = definition.action,

            attachment = source,
            controller, aborted;
        
        controller = source.controller();
        if ( controller !== target.controller() ) {
            controller = undefined;
        }

        // (Exposed for debugging.)
        Z.env.debug && Z.assign( this.__private__ = {}, {
            methods: methods,
            events: events,
            action: action
        });

        Z.assign( this, {
            // #### superstate
            // 
            // In a transition, `superstate` is used to track its position as it traverses the
            // `State` subtree that defines its domain.
            superstate: function () { return attachment; },

            // #### attachTo
            attachTo: function ( state ) { return attachment = state; },

            // #### controller
            controller: function () { return controller; },

            // #### origin
            // 
            // A transition's **origin** is the controller’s most recently active `State` that is
            // not itself a `Transition`.
            origin: function () {
                return source instanceof Transition ? source.origin() : source;
            },

            // #### source
            // 
            // A transition’s **source** is the `State` or `Transition` that immediately preceded
            // `this`.
            source: function () { return source; },

            // #### target
            // 
            // The intended destination `State` for this transition. If a target is invalidated by
            // a controller that `change`s state again before this transition completes, then this
            // transition is aborted and the `change` call will create a new transition that is
            // `source`d from `this`.
            target: function () { return target; },

            // #### setCallback
            // 
            // Allows the callback function to be set or changed prior to the transition’s
            // completion.
            setCallback: function ( fn ) { return callback = fn; },

            // #### aborted
            aborted: function () { return aborted; },
            
            // #### start
            // 
            // Starts the transition; if an `action` is defined, that function is responsible
            // for declaring an end to the transition by calling `end()`. Otherwise, the
            // transition is necessarily synchronous and is concluded immediately.
            start: function () {
                var self = this;
                aborted = false;
                this.emit( 'start', false );
                if ( Z.isFunction( action ) ) {
                    action.apply( this, arguments );
                } else {
                    return this.end();
                }
            },
            
            // #### abort
            // 
            // Indicates that a transition won’t directly reach its target state; for example, if a
            // new transition is initiated while an asynchronous transition is already underway,
            // that previous transition is aborted. The previous transition is retained as the
            // `source` for the new transition.
            abort: function () {
                aborted = true;
                callback = null;
                this.emit( 'abort', false );
                return this;
            },
            
            // #### end
            // 
            // Indicates that a transition has completed and has reached its intended target. The
            // transition is subsequently retired, along with any preceding aborted transitions.
            end: function () {
                if ( !aborted ) {
                    this.emit( 'end', false );
                    callback && callback.apply( controller, arguments );
                }
                this.destroy();
                return target;
            },
            
            // #### destroy
            // 
            // Destroys this transition and clears its held references, and does the same for any
            // aborted `source` transitions that preceded it.
            destroy: function () {
                source instanceof Transition && source.destroy();
                target = attachment = controller = null;
            }
        });
        Z.privilege( this, State.privileged, {
            'init' : [ TransitionDefinition ],
            'method methodNames addMethod removeMethod' : [ methods ],
            'event addEvent removeEvent emit' : [ events ],
        });
        Z.alias( this, { addEvent: 'on bind', removeEvent: 'off unbind', emit: 'trigger' } );
        
        this.init( definition );
        definition = null;
    }

    Transition.prototype.depth = function () {
        var count = 0, transition = this, source;
        while ( ( source = transition.source() ) instanceof Transition ) {
            transition = source;
            count++;
        }
        return count;
    };
    
    return Transition;
})();

// ## TransitionDefinition
// 
// A state may hold **transition definitions** that describe the transition that will take place
// between any two given **origin** and **target** states.

var TransitionDefinition = ( function () {
    var properties = Z.assign( TRANSITION_PROPERTIES, null ),
        categories = Z.assign( TRANSITION_DEFINITION_CATEGORIES, null ),
        eventTypes = Z.assign( TRANSITION_EVENT_TYPES );
    
    // ### Constructor
    function TransitionDefinition ( map ) {
        if ( !( this instanceof TransitionDefinition ) ) {
            return new TransitionDefinition( map );
        }
        Z.extend( true, this, map instanceof TransitionDefinition ? map : interpret( map ) );
    }

    // ### Static functions

    // #### interpret
    // 
    // Rewrites a plain object map as a well-formed `TransitionDefinition`, making the appropriate
    // inferences for any shorthand notation encountered.
    function interpret ( map ) {
        var result = Z.extend( {}, properties, categories ),
            key, value, category, events;
        
        for ( key in map ) if ( Z.hasOwn.call( map, key ) ) {
            value = map[ key ];
            if ( key in properties ) {
                result[ key ] = value;
            }
            else if ( key in categories ) {
                Z.extend( result[ key ], value );
            }
            else {
                category = key in eventTypes ? 'events' : 'methods';
                ( result[ category ] || ( result[ category ] = {} ) )[ key ] = value;
            }
        }
        for ( key in ( events = result.events ) ) {
            Z.isFunction( value = events[ key ] ) && ( events[ key ] = [ value ] );
        }

        return result;
    }

    return TransitionDefinition;
})();


// Make the set of defined classes available as members of the exported module.
Z.assign( state, {
    State: State,
    StateDefinition: StateDefinition,
    StateController: StateController,
    StateEvent: StateEvent,
    StateEventCollection: StateEventCollection,
    Transition: Transition,
    TransitionDefinition: TransitionDefinition
});

}).call( this );

