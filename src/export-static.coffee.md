    global = this



This function will be applied to the package’s exported `state` function.

    module.exports = ( state = this ) ->
      { define } = this


### [Package metadata](#package-metadata)

      @VERSION = '0.2.0'

      @options =
        memoizeProtostates: yes
        useDispatchTables: no



### [Imports](#imports)

**State** uses [Omicron][] to assist with object manipulation tasks, such as
differential operations.

      @O = {

`env` is a set of variables that describe the platform environment.

        @env

The `NIL` identity is a sentinel used by diff/patch operations to indicate
the deletion or nonexistence of a property.

        @NIL

      } = require 'omicron'



### [Constants](#constants)

      @rxAccessor = /([$_A-Za-z][$\w]*)::(.*)/
      @rxDelegatedEvent = /^(.*)\:([\w$]+)\s*$/
      @rxTransitionArrow = /^\s*([\-=]>)\s*(.*)/
      @transitionArrowMethods =
        '->': 'change'
        '=>': 'changeTo'



### [Utility functions](#utility-functions)


#### [noConflict](#utility-functions--no-conflict)

      @noConflict = do ->
        original = global.state
        -> global.state = original; this


#### [bitfield](#utility-functions--bitfield)

Creates a bit field map on a given `object` by associating each string in a
list of `names` as a key to a single-bit integer value. Bit values are applied
to keys in order, increasing from `1 << offset` onward.

      @bitfield = ( object = {}, names, offset = 0 ) ->
        names = names.split /\s+/ if typeof names is 'string'
        object[ key ] = 1 << index + offset for key, index in names
        object


#### [debug](#utility-functions--debug)

      @debug = => console.log.apply console, arguments if @env.debug


#### [bind](#utility-functions--bind)

* `fn` : function

Used inside a state expression, a function `fn` wrapped with `state.bind` will
bind the context of `fn` either to any `State` created from that expression, or
when invoked for an object that inherits from the `owner` of the bound `State`,
to the corresponding **epistate** of that `State`.

Thusly bound methods, event listeners, etc., whose context would have normally
been the `owner`, still retain a reference thereto via `this.owner`.

      @bind = do ->
        bind = ( fn ) -> new StateBoundFunction fn
        bind.class = class StateBoundFunction
          type: 'state-bound-function'
          constructor: ( @fn ) ->
        bind


#### [fix](#utility-functions--fix)

* `fn` : ( autostate, protostate ) → function

Used inside a state expression, a function `fn` wrapped with `state.fix` will
be partially applied with a reference to `autostate`, the precise `State` to
which `fn`’s returned function will belong, and a reference to `protostate`,
the immediate **protostate** of `autostate`.

A method, event listener, etc. that is `fix`ed thusly has access to, and full
lexical awareness of, the particular `State` environment in which it exists.

      @fix = do ->
        fix = ( fn ) -> new StateFixedFunction fn
        fix.class = class StateFixedFunction
          type: 'state-fixed-function'
          constructor: ( @fn ) ->
        fix


#### [own](#utility-functions--own)

Causes `owner` to realize and take ownership of the protostate or virtual
epistate returned by `selector`. Returns the incipient or extant “own” state,
augmented with any `StateExpression` content supplied by the optional `expr`.

      @own = do =>
        { rxAccessor } = this

        ( owner, selector, expr ) ->
          if rxAccessor.test selector
          then [ match, accessorName, selector ] = rxAccessor.exec selector
          else accessorName = 'state'

          return null unless instated = owner[ accessorName ] selector
          if instated.owner is owner
          then instated[ instated.isVirtual() and 'realize' or 'mutate' ] expr
          else instated.virtualize( owner[ accessorName ] '' ).realize expr


#### [extend](#utility-functions--extend)

      @extend = ( parastates, attributes, expression ) ->
        if typeof attributes isnt 'string'
          expression = attributes
          attributes = ''
        expression ?= {}
        expression.parastates = parastates
        define attributes, expression



### [Name sets](#name-sets)

The **state attribute modifiers** are the subset of attribute names that are
valid or reserved keywords for the `attributes` argument in a call to the
exported `state()` function.

      @STATE_ATTRIBUTE_MODIFIERS = """
        mutable finite static immutable
        initial conclusive final
        abstract concrete default
        reflective
        history retained shallow versioned
        concurrent
      """

      @STATE_EXPRESSION_CATEGORIES =
        'parastates data methods events guards substates transitions'

      @STATE_EXPRESSION_CATEGORY_SYNONYMS =
        extend:  'parastates'
        extends: 'parastates'
        states:  'substates'

      @STATE_EVENT_TYPES =
        'construct depart exit enter arrive destroy mutate noSuchMethod'

      @GUARD_ACTIONS =
        'admit release'

      @TRANSITION_PROPERTIES =
        'origin source target action conjugate'

      @TRANSITION_EXPRESSION_CATEGORIES =
        'methods events guards'

      @TRANSITION_EVENT_TYPES =
        'construct destroy enter exit start end abort'



### [Bit field enums](#bit-field-enums)


#### [State attributes](#bit-field-enums--state-attributes)

`State` instances use a bit field to store their attributes, the encoded values
of which are included in the constants enumerated here.

      @STATE_ATTRIBUTES = @bitfield { NORMAL: 0 }, """
        INCIPIENT
        ATOMIC
        DESTROYED
        VIRTUAL
        PARASTATIC
      """ + ' ' + @STATE_ATTRIBUTE_MODIFIERS.toUpperCase()


#### [Traversal flags](#bit-field-enums--traversal-flags)

Tree-traversal operations use these flags to restrict their recursive scope.

      @TRAVERSAL_FLAGS = @bitfield { VIA_NONE: 0, VIA_ALL: ~0 }, """
        VIA_SUB
        VIA_PARA
        VIA_SUPER
        VIA_PROTO
        VIA_VIRTUAL
      """
      ( -> @VIA_HYPER = @VIA_PARA | @VIA_SUPER ).apply @TRAVERSAL_FLAGS



      return



[Omicron]: https://github.com/nickfargo/omicron
