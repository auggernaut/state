;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){

(function() {
  var exports, state;

  module.exports = state = require('./state-function');

  exports = function() {
    this.State = require('./state');
    this.StateExpression = require('./state-expression');
    this.RootState = require('./root-state');
    this.Transition = require('./transition');
    return this.TransitionExpression = require('./transition-expression');
  };

  if (typeof window !== 'undefined') window.state = state;

  exports.apply(state);

}).call(this);

},{"./state-function":2,"./state":3,"./state-expression":4,"./root-state":5,"./transition":6,"./transition-expression":7}],2:[function(require,module,exports){

(function() {
  var RootState, StateExpression, state;

  RootState = null;

  StateExpression = null;

  module.exports = state = function(owner, attributes, expression, options) {
    if (arguments.length < 2) {
      if (typeof owner === 'string') {
        attributes = owner;
      } else {
        expression = owner;
      }
      owner = void 0;
    } else {
      if (typeof owner === 'string') {
        options = expression;
        expression = attributes;
        attributes = owner;
        owner = void 0;
      }
      if (typeof attributes !== 'string') {
        options = expression;
        expression = attributes;
        attributes = void 0;
      }
    }
    expression = new StateExpression(attributes, expression);
    if (owner) {
      return (new RootState(owner, expression, options))._current;
    } else {
      return expression;
    }
  };

  (require('./export-static')).apply(state);

  RootState = require('./root-state');

  StateExpression = require('./state-expression');

}).call(this);

},{"./export-static":8,"./root-state":5,"./state-expression":4}],6:[function(require,module,exports){

(function() {
  var State, Transition,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  State = require('./state');

  module.exports = Transition = (function(_super) {
    var VIA_PROTO;

    __extends(Transition, _super);

    VIA_PROTO = Transition.VIA_PROTO;

    function Transition(target, source, expression, callback) {
      var root;
      this.name = expression.name || null;
      this.superstate = source;
      root = source.root;
      if (target.root !== root) {
        throw ReferenceError;
      }
      this.root = root;
      this.owner = root.owner;
      this.target = target;
      this.source = source;
      this.origin = source instanceof Transition ? source.origin : source;
      this.callback = callback;
      this.action = expression.action || null;
      this._ = new this.Content;
      this.aborted = false;
      this.initialize(expression);
    }

    Transition.prototype.start = function() {
      var action;
      this.aborted = false;
      this.emit('start', arguments, VIA_PROTO);
      if (action = this.action) {
        action.apply(this, arguments);
        return this;
      } else {
        return this.end.apply(this, arguments);
      }
    };

    Transition.prototype.abort = function() {
      this.aborted = true;
      this.callback = null;
      this.emit('abort', arguments, VIA_PROTO);
      return this;
    };

    Transition.prototype.end = function() {
      var _ref;
      if (!this.aborted) {
        this.emit('end', arguments, VIA_PROTO);
        if ((_ref = this.callback) != null) {
          _ref.apply(this.root, arguments);
        }
      }
      this.destroy();
      return this.target;
    };

    Transition.prototype.destroy = function() {
      if (this.source instanceof Transition) {
        this.source.destroy();
      }
      return this.target = this.superstate = this.root = null;
    };

    return Transition;

  })(State);

}).call(this);

},{"./state":3}],7:[function(require,module,exports){

(function() {
  var GUARD_ACTIONS, O, TRANSITION_EVENT_TYPES, TRANSITION_EXPRESSION_CATEGORIES, TRANSITION_PROPERTIES, TransitionExpression, state,
    __hasProp = {}.hasOwnProperty;

  state = require('./state-function');

  O = state.O, TRANSITION_PROPERTIES = state.TRANSITION_PROPERTIES, TRANSITION_EXPRESSION_CATEGORIES = state.TRANSITION_EXPRESSION_CATEGORIES, TRANSITION_EVENT_TYPES = state.TRANSITION_EVENT_TYPES, GUARD_ACTIONS = state.GUARD_ACTIONS;

  module.exports = TransitionExpression = (function() {
    var assign, categories, clone, edit, eventTypes, guardActions, interpret, properties;

    assign = O.assign, edit = O.edit, clone = O.clone;

    properties = assign(TRANSITION_PROPERTIES, null);

    categories = assign(TRANSITION_EXPRESSION_CATEGORIES, null);

    eventTypes = assign(TRANSITION_EVENT_TYPES);

    guardActions = assign(GUARD_ACTIONS);

    function TransitionExpression(map) {
      if (!(map instanceof TransitionExpression)) {
        map = interpret(map);
      }
      edit('deep all', this, map);
    }

    interpret = function(map) {
      var category, events, item, key, result, value, _ref;
      result = assign({}, properties, categories);
      for (key in map) {
        if (!__hasProp.call(map, key)) continue;
        value = map[key];
        if (key in properties) {
          result[key] = value;
        } else if (key in categories) {
          result[key] = clone(result[key], value);
        } else {
          category = key in eventTypes ? 'events' : key in guardActions ? 'guards' : typeof value === 'functions' ? 'methods' : void 0;
          if (category) {
            item = result[category];
            item || (item = result[category] = {});
            item[key] = value;
          }
        }
      }
      _ref = events = result.events;
      for (key in _ref) {
        value = _ref[key];
        if (typeof value === 'function') {
          events[key] = [value];
        }
      }
      return result;
    };

    return TransitionExpression;

  })();

}).call(this);

},{"./state-function":2}],9:[function(require,module,exports){

(function() {
  var StateContent, state;

  state = require('./state-function');

  module.exports = StateContent = (function() {
    var useDispatchTables;

    useDispatchTables = state.options.useDispatchTables;

    function StateContent() {
      this.data = null;
      this.methods = null;
      this.events = null;
      this.guards = null;
      this.substates = null;
      this.transitions = null;
      if (useDispatchTables) {
        this.__dispatch_table__ = null;
      }
    }

    return StateContent;

  })();

}).call(this);

},{"./state-function":2}],3:[function(require,module,exports){

(function() {
  var O, STATE_ATTRIBUTES, State, StateEventEmitter, StateExpression, TRAVERSAL_FLAGS, TransitionExpression, state,
    __hasProp = {}.hasOwnProperty,
    __slice = [].slice;

  O = require('omicron');

  state = require('./state-function');

  StateEventEmitter = null;

  StateExpression = null;

  TransitionExpression = null;

  STATE_ATTRIBUTES = state.STATE_ATTRIBUTES, TRAVERSAL_FLAGS = state.TRAVERSAL_FLAGS;

  module.exports = State = (function() {
    var ABSTRACT, ABSTRACT_OR_CONCRETE, ATOMIC, CONCLUSIVE, CONCRETE, CONCURRENT, DEFAULT, DESTROYED, FINAL, FINITE, HISTORY, IMMUTABLE, INCIPIENT, INCIPIENT_OR_MUTABLE, INCIPIENT_OR_VIRTUAL, INITIAL, MUTABLE, MUTABLE_OR_FINITE, NIL, NORMAL, PROTO_HERITABLE_ATTRIBUTES, REFLECTIVE, RETAINED, SHALLOW, STATIC, VIA_ALL, VIA_NONE, VIA_PROTO, VIA_SUB, VIA_SUPER, VIRTUAL, assign, clone, createDispatcher, delta, edit, env, flatten, has, hasOwn, isArray, isEmpty, lookup, memoizeProtostates, mutate, useDispatchTables, _ref, _ref1, _ref2;

    _ref = state.options, memoizeProtostates = _ref.memoizeProtostates, useDispatchTables = _ref.useDispatchTables;

    env = O.env, NIL = O.NIL, isArray = O.isArray, isEmpty = O.isEmpty, has = O.has, hasOwn = O.hasOwn;

    assign = O.assign, edit = O.edit, delta = O.delta, clone = O.clone, lookup = O.lookup, flatten = O.flatten;

    _ref1 = assign(State, STATE_ATTRIBUTES), INCIPIENT = _ref1.INCIPIENT, ATOMIC = _ref1.ATOMIC, DESTROYED = _ref1.DESTROYED, VIRTUAL = _ref1.VIRTUAL, MUTABLE = _ref1.MUTABLE, FINITE = _ref1.FINITE, STATIC = _ref1.STATIC, IMMUTABLE = _ref1.IMMUTABLE, INITIAL = _ref1.INITIAL, CONCLUSIVE = _ref1.CONCLUSIVE, FINAL = _ref1.FINAL, ABSTRACT = _ref1.ABSTRACT, CONCRETE = _ref1.CONCRETE, DEFAULT = _ref1.DEFAULT, REFLECTIVE = _ref1.REFLECTIVE, HISTORY = _ref1.HISTORY, RETAINED = _ref1.RETAINED, SHALLOW = _ref1.SHALLOW, CONCURRENT = _ref1.CONCURRENT, NORMAL = _ref1.NORMAL;

    _ref2 = assign(State, TRAVERSAL_FLAGS), VIA_NONE = _ref2.VIA_NONE, VIA_SUB = _ref2.VIA_SUB, VIA_SUPER = _ref2.VIA_SUPER, VIA_PROTO = _ref2.VIA_PROTO, VIA_ALL = _ref2.VIA_ALL;

    MUTABLE_OR_FINITE = MUTABLE | FINITE;

    ABSTRACT_OR_CONCRETE = ABSTRACT | CONCRETE;

    INCIPIENT_OR_VIRTUAL = INCIPIENT | VIRTUAL;

    INCIPIENT_OR_MUTABLE = INCIPIENT | MUTABLE;

    PROTO_HERITABLE_ATTRIBUTES = MUTABLE | FINITE | STATIC | IMMUTABLE | INITIAL | CONCLUSIVE | FINAL | ABSTRACT | CONCRETE | DEFAULT | REFLECTIVE | HISTORY | RETAINED | SHALLOW | CONCURRENT | NORMAL;

    State.prototype.Expression = null;

    State.prototype.Content = null;

    function State(base, name, expression) {
      var attributes, owner, protoAttr, protostate, root, superAttr, superstate;
      this.name = name;
      if (base instanceof State) {
        this.superstate = superstate = base;
        this.root = root = superstate.root;
        this.owner = owner = root.owner;
      } else {
        this.superstate = superstate = null;
        this.root = root = this;
        this.owner = owner = base;
      }
      attributes = (expression != null ? expression.attributes : void 0) || NORMAL;
      if (superstate) {
        superAttr = superstate.attributes;
        attributes |= superAttr & MUTABLE_OR_FINITE;
      }
      if (protostate = this.protostate()) {
        protoAttr = protostate.attributes & PROTO_HERITABLE_ATTRIBUTES;
        if (attributes & CONCRETE) {
          attributes &= ~ABSTRACT;
        }
        if (attributes & ABSTRACT_OR_CONCRETE) {
          protoAttr &= ~ABSTRACT_OR_CONCRETE;
        }
        attributes |= protoAttr;
      }
      if (~attributes & ABSTRACT) {
        attributes |= CONCRETE;
      }
      attributes |= (superAttr | protoAttr) & IMMUTABLE;
      if (attributes & IMMUTABLE) {
        attributes &= ~MUTABLE;
        attributes |= FINITE;
      }
      this.attributes = attributes;
      if (!(attributes & VIRTUAL)) {
        this.initialize(expression);
      }
      if (env.debug) {
        this[' <path>'] = this.path();
        this['<attributes>'] = StateExpression.decodeAttributes(attributes);
      }
    }

    createDispatcher = (function() {
      var toString;
      toString = function() {
        return "[dispatcher]";
      };
      return function(accessorName, methodName, original) {
        var dispatcher;
        dispatcher = function() {
          return this[accessorName]().apply(methodName, arguments);
        };
        dispatcher.isDispatcher = true;
        if (env.debug) {
          dispatcher.toString = toString;
        }
        if (original) {
          dispatcher.original = original;
        }
        return dispatcher;
      };
    })();

    State.prototype.initialize = function(expression) {
      var attributes;
      attributes = this.attributes;
      if (attributes & VIRTUAL) {
        return;
      }
      this.attributes |= INCIPIENT;
      this.realize(expression);
      this.attributes &= ~INCIPIENT;
      this.emit('construct', expression, VIA_PROTO);
      return this;
    };

    State.prototype.realize = function(expression) {
      var key, method, _ref3;
      if (!(this.attributes & INCIPIENT_OR_VIRTUAL)) {
        return this;
      }
      this._ || (this._ = new this.Content);
      mutate.call(this, expression);
      if (this === this.root) {
        _ref3 = this.owner;
        for (key in _ref3) {
          if (!__hasProp.call(_ref3, key)) continue;
          method = _ref3[key];
          if (key !== 'constructor' && typeof method === 'function' && !method.isDispatcher && this.method(key, VIA_PROTO)) {
            this.addMethod(key, method);
          }
        }
      }
      return this;
    };

    State.prototype.virtualize = function(inheritor) {
      var derivation, expr, i, name, real, s;
      if (!(inheritor instanceof State && this.owner.isPrototypeOf(inheritor.owner))) {
        return null;
      }
      if (!(derivation = this.derivation(true)).length) {
        return null;
      }
      i = 0;
      s = inheritor.root;
      while (name = derivation[i++]) {
        if (!(real = s.substate(name, VIA_NONE))) {
          break;
        }
        s = real;
      }
      expr = {
        attributes: VIRTUAL
      };
      while (name) {
        s = new State(s, name, expr);
        name = derivation[i++];
      }
      return s;
    };

    State.prototype.destroy = function() {
      var dispatcher, event, events, key, methods, name, owner, ownerMethod, root, substate, substates, superstate, transition, _;
      owner = this.owner, root = this.root, superstate = this.superstate, _ = this._;
      if (_) {
        methods = _.methods, events = _.events, substates = _.substates;
      }
      if (transition = root._transition) {
        if (this === root) {
          transition.abort();
        } else {
          if (transition.origin.isIn(this) || transition.target.isIn(this)) {
            return false;
          }
        }
      }
      for (name in substates) {
        if (!__hasProp.call(substates, name)) continue;
        substate = substates[name];
        substate.destroy();
      }
      this.emit('destroy', VIA_PROTO);
      if (events) {
        for (key in events) {
          event = events[key];
          event.destroy();
          delete events[key];
        }
      }
      if (this === root) {
        for (name in methods) {
          if (!(dispatcher = owner[name])) {
            continue;
          }
          if (!dispatcher.isDispatcher) {
            continue;
          }
          if (ownerMethod = dispatcher.original) {
            owner[name] = ownerMethod;
          } else {
            delete owner[name];
          }
        }
        delete owner[this.accessorName];
      }
      this.attributes |= DESTROYED;
      if (superstate != null) {
        superstate.removeSubstate(this.name);
      }
      return true;
    };

    State.prototype.express = (function() {
      var cloneCategory, cloneEvents, cloneSubstates;
      cloneCategory = function(object) {
        var key, out, value;
        if (object == null) {
          return;
        }
        for (key in object) {
          out = {};
          break;
        }
        if (out) {
          for (key in object) {
            value = object[key];
            out[key] = value && typeof value === 'object' ? clone(value) : value;
          }
        }
        return out;
      };
      cloneEvents = function(events) {
        var emitter, out, type;
        if (events == null) {
          return;
        }
        for (type in events) {
          emitter = events[type];
          if (emitter) {
            out = {};
            break;
          }
        }
        for (type in events) {
          emitter = events[type];
          if (emitter) {
            out[type] = clone(emitter.items);
          }
        }
        return out;
      };
      cloneSubstates = function(substates, typed) {
        var name, out, substate;
        if (substates == null) {
          return;
        }
        for (name in substates) {
          out = {};
          break;
        }
        for (name in substates) {
          substate = substates[name];
          out[name] = substate.express(typed);
        }
        return out;
      };
      return function(typed) {
        var expression, _;
        if (_ = this._) {
          expression = edit({}, {
            attributes: this.attributes,
            data: cloneCategory(_.data),
            methods: cloneCategory(_.methods),
            events: cloneEvents(_.events),
            guards: cloneCategory(_.guards),
            states: cloneSubstates(_.substates, typed),
            transitions: cloneCategory(_.transitions)
          });
        }
        if (typed) {
          return new this.Expression(expression);
        } else {
          return expression;
        }
      };
    })();

    State.prototype.mutate = mutate = (function() {
      var diff, editEvent, isPlainObject;
      NIL = O.NIL, isArray = O.isArray, isEmpty = O.isEmpty, isPlainObject = O.isPlainObject, edit = O.edit, diff = O.diff;
      editEvent = function(object, emitter) {
        var items, key, value, _results;
        items = emitter.items;
        _results = [];
        for (key in object) {
          if (!__hasProp.call(object, key)) continue;
          value = object[key];
          if (value === NIL) {
            _results.push(emitter.remove(key));
          } else if (value && value !== items[key]) {
            _results.push(emitter.set(key, value));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      return mutate = function(expr) {
        var Expression, after, attributes, before, data, element, emitter, event, events, guards, incipient, method, methods, mutable, name, notStrongImmutable, residue, stateExpr, substates, transitionExpr, transitions, type, _base, _base1, _i, _len, _ref3, _ref4, _ref5, _ref6, _ref7;
        attributes = this.attributes, Expression = this.Expression;
        if (attributes & VIRTUAL) {
          this.realize();
        }
        incipient = attributes & INCIPIENT;
        mutable = incipient || attributes & MUTABLE;
        notStrongImmutable = incipient || !(attributes & IMMUTABLE);
        _ref3 = this._, data = _ref3.data, methods = _ref3.methods, events = _ref3.events, guards = _ref3.guards, substates = _ref3.substates, transitions = _ref3.transitions;
        if (!(expr instanceof Expression)) {
          expr = new Expression(expr);
        }
        if (!incipient) {
          before = this.express();
        }
        this.attributes |= ATOMIC;
        if (expr.data) {
          this.data(expr.data);
        }
        if (mutable) {
          _ref4 = expr.methods;
          for (name in _ref4) {
            if (!__hasProp.call(_ref4, name)) continue;
            method = _ref4[name];
            if (method !== NIL) {
              this.addMethod(name, method);
            } else {
              this.removeMethod(name);
            }
          }
        }
        if (mutable) {
          _ref5 = expr.events;
          for (type in _ref5) {
            if (!__hasProp.call(_ref5, type)) continue;
            event = _ref5[type];
            events || (events = (_base = this._).events || (_base.events = {}));
            emitter = events[type];
            if (event === NIL) {
              if (emitter != null) {
                emitter.empty();
              }
              continue;
            }
            if (!emitter && event && !isEmpty(event)) {
              emitter = events[type] = new StateEventEmitter(this, type);
            }
            if (isArray(event)) {
              for (_i = 0, _len = event.length; _i < _len; _i++) {
                element = event[_i];
                if ((element != null) && element !== NIL) {
                  if (isPlainObject(element)) {
                    editEvent(element, emitter);
                  } else {
                    this.addEvent(type, element);
                  }
                }
              }
            } else {
              if (isPlainObject(event)) {
                editEvent(event, emitter);
              }
            }
            if (!emitter.length) {
              emitter.destroy();
              delete events[type];
            }
          }
        }
        if (mutable && expr.guards) {
          guards || (guards = (_base1 = this._).guards || (_base1.guards = {}));
          edit('deep', guards, expr.guards);
        }
        if (notStrongImmutable) {
          _ref6 = expr.states;
          for (name in _ref6) {
            if (!__hasProp.call(_ref6, name)) continue;
            stateExpr = _ref6[name];
            if (substates && name in substates) {
              if (stateExpr === NIL) {
                this.removeSubstate(name);
              } else {
                substates[name].mutate(stateExpr);
              }
            } else {
              if (stateExpr !== NIL) {
                this.addSubstate(name, stateExpr);
              }
            }
          }
        }
        if (mutable) {
          _ref7 = expr.transitions;
          for (name in _ref7) {
            if (!__hasProp.call(_ref7, name)) continue;
            transitionExpr = _ref7[name];
            if (transitions && name in transitions) {
              if (transitionExpr === NIL) {
                delete transitions[name];
              } else {
                transitions[name] = new TransitionExpression(transitionExpr);
              }
            } else {
              if (transitionExpr !== NIL) {
                this.addTransition(name, transitionExpr);
              }
            }
          }
        }
        this.attributes &= ~ATOMIC;
        if (!incipient) {
          after = this.express();
          residue = diff(before, after);
          if (!isEmpty(residue)) {
            this.emit('mutate', [expr, residue, before, after], VIA_PROTO);
          }
        }
        return this;
      };
    })();

    State.prototype.isVirtual = function() {
      return !!(this.attributes & VIRTUAL);
    };

    State.prototype.isMutable = function() {
      return !!(this.attributes & MUTABLE);
    };

    State.prototype.isFinite = function() {
      return !!(this.attributes & FINITE);
    };

    State.prototype.isStatic = function() {
      return !!(this.attributes & STATIC);
    };

    State.prototype.isImmutable = function() {
      return !!(this.attributes & IMMUTABLE);
    };

    State.prototype.isInitial = function() {
      return !!(this.attributes & INITIAL);
    };

    State.prototype.isConclusive = function() {
      return !!(this.attributes & CONCLUSIVE);
    };

    State.prototype.isFinal = function() {
      return !!(this.attributes & FINAL);
    };

    State.prototype.isAbstract = function() {
      return !!(this.attributes & ABSTRACT);
    };

    State.prototype.isConcrete = function() {
      return !!(this.attributes & CONCRETE);
    };

    State.prototype.isDefault = function() {
      return !!(this.attributes & DEFAULT);
    };

    State.prototype.isReflective = function() {
      return !!(this.attributes & REFLECTIVE);
    };

    State.prototype.hasHistory = function() {
      return !!(this.attributes & HISTORY);
    };

    State.prototype.isRetained = function() {
      return !!(this.attributes & RETAINED);
    };

    State.prototype.isShallow = function() {
      return !!(this.attributes & SHALLOW);
    };

    State.prototype.isConcurrent = function() {
      return !!(this.attributes & CONCURRENT);
    };

    State.prototype.derivation = function(byName) {
      var results, s, ss;
      results = [];
      ss = this;
      while ((s = ss) && (ss = s.superstate)) {
        results.push(byName ? s.name || '' : s);
      }
      return results.reverse();
    };

    State.prototype.path = function() {
      return this.derivation(true).join('.');
    };

    State.prototype.toString = State.prototype.path;

    State.prototype.depth = function() {
      var n, s;
      n = 0;
      s = this;
      while (s = s.superstate) {
        n += 1;
      }
      return n;
    };

    State.prototype.common = function(other) {
      var s;
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      if (this.depth() > other.depth()) {
        s = other;
        other = this;
      } else {
        s = this;
      }
      while (s) {
        if (s === other || s.isSuperstateOf(other)) {
          return s;
        }
        s = s.superstate;
      }
      return null;
    };

    State.prototype.is = function(other) {
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      return other === this;
    };

    State.prototype.isIn = function(other) {
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      return other === this || other.isSuperstateOf(this);
    };

    State.prototype.hasSubstate = function(other) {
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      return other === this || this.isSuperstateOf(other);
    };

    State.prototype.isSuperstateOf = function(other) {
      var superstate;
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      if (superstate = other.superstate) {
        return this === superstate || this.isSuperstateOf(superstate);
      } else {
        return false;
      }
    };

    State.prototype.protostate = function() {
      var accessorName, first, getPrototypeOf, owner, path, protostate, prototype, root;
      if (protostate = this._protostate) {
        return protostate;
      }
      getPrototypeOf = O.getPrototypeOf;
      owner = this.owner, root = this.root;
      accessorName = root.accessorName;
      path = this.path();
      first = prototype = getPrototypeOf(owner);
      while (prototype) {
        if (protostate = typeof prototype[accessorName] === "function" ? prototype[accessorName](path, VIA_NONE) : void 0) {
          if (prototype === first) {
            this._protostate = protostate;
          }
          return protostate;
        }
        prototype = getPrototypeOf(prototype);
      }
    };

    State.prototype.isProtostateOf = function(other) {
      var protostate;
      if (!(other instanceof State)) {
        other = this.query(other);
      }
      if (protostate = other.protostate()) {
        return this === protostate || this.isProtostateOf(protostate);
      } else {
        return false;
      }
    };

    State.prototype.defaultSubstate = function(via, first) {
      var protostate, s, substates, _i, _len, _ref3;
      if (via == null) {
        via = VIA_PROTO;
      }
      _ref3 = substates = this.substates();
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        s = _ref3[_i];
        if (s.attributes & DEFAULT) {
          return s;
        }
      }
      first || substates.length && (first = substates[0]);
      if (via & VIA_PROTO && (protostate = this.protostate())) {
        return protostate.defaultSubstate(VIA_PROTO);
      }
      return first;
    };

    State.prototype.initialSubstate = function(via) {
      var i, protostate, queue, s, subject, substates, _i, _len, _ref3;
      if (via == null) {
        via = VIA_PROTO;
      }
      i = 0;
      queue = [this];
      while (subject = queue[i++]) {
        _ref3 = substates = subject.substates(VIA_PROTO);
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          s = _ref3[_i];
          if (s.attributes & INITIAL) {
            return s.initialSubstate(VIA_NONE) || s;
          }
          queue.push(s);
        }
      }
      if (via & VIA_PROTO && (protostate = this.protostate())) {
        return protostate.initialSubstate(VIA_PROTO);
      }
    };

    State.prototype.query = function(selector, against, via, toBeSkipped) {
      var cursor, i, l, name, next, parts, queue, result, subject, substate, _i, _len, _ref3, _ref4, _ref5;
      if (via == null) {
        via = VIA_ALL;
      }
      if (typeof against === 'number') {
        toBeSkipped = via;
        via = against;
        against = void 0;
      }
      if (selector == null) {
        if (against === void 0) {
          return null;
        } else {
          return false;
        }
      }
      if (selector === '.') {
        if (against === void 0) {
          return this;
        } else {
          return against === this;
        }
      }
      if (selector === '') {
        if (against === void 0) {
          return this.root;
        } else {
          return against === this.root;
        }
      }
      if (against && against === this.root && /^\*+$/.test(selector)) {
        return true;
      }
      if (/^\.*\**$/.test(selector)) {
        via &= ~(VIA_SUB | VIA_SUPER);
      }
      if (selector.charAt(0) !== '.') {
        return this.root.query('.' + selector, against, VIA_SUB | VIA_PROTO);
      }
      selector = selector.replace(/^(\.+)\.$/, '$1');
      parts = selector.split('.');
      i = 0;
      l = parts.length;
      cursor = this;
      while (cursor) {
        i += 1;
        if (i >= l) {
          return (against ? against === cursor : cursor);
        }
        name = parts[i];
        if (name === '*') {
          if (!against) {
            return cursor.substates();
          }
          if (cursor === against.superstate) {
            return true;
          }
          break;
        }
        if (name === '**') {
          if (!against) {
            return cursor.substates(true);
          }
          if (cursor.isSuperstateOf(against)) {
            return true;
          }
          break;
        }
        if (name === '') {
          cursor = cursor.superstate;
        } else if (next = cursor.substate(name)) {
          cursor = next;
        } else {
          break;
        }
      }
      if (via & VIA_SUB) {
        i = 0;
        queue = [this];
        while (subject = queue[i++]) {
          _ref3 = subject.substates(false, true);
          for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
            substate = _ref3[_i];
            if (substate === toBeSkipped) {
              continue;
            }
            result = substate.query(selector, against, VIA_NONE);
            if (result) {
              return result;
            }
            queue.push(substate);
          }
        }
      }
      if (via & VIA_SUPER) {
        if (result = (_ref4 = this.superstate) != null ? _ref4.query(selector, against, via & VIA_SUB | VIA_SUPER, via & VIA_SUB ? this : void 0) : void 0) {
          return result;
        }
      }
      if (via & VIA_PROTO) {
        if (result = (_ref5 = this.protostate()) != null ? _ref5.query(selector, against, via) : void 0) {
          return result;
        }
      }
      if (against) {
        return false;
      } else {
        return null;
      }
    };

    State.prototype.$ = function() {
      var args, expr, match, method;
      expr = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (typeof expr === 'function') {
        if (expr = expr()) {
          return this.change.apply(this, [expr].concat(args));
        }
      } else if (typeof expr === 'string' && (match = expr.match(rxTransitionArrow)) && (method = transitionArrowMethods[match[1]])) {
        if (args.length) {
          return this[method].apply(this, [match[2]].concat(args));
        } else {
          return this[method](match[2]);
        }
      }
    };

    State.prototype.current = function() {
      return this.root._current;
    };

    State.prototype.isCurrent = function() {
      return this === this.current();
    };

    State.prototype.isActive = function() {
      var current;
      return this === (current = this.current()) || this.isSuperstateOf(current);
    };

    State.prototype.change = function(target, options) {
      var root;
      return (root = this.root).change.apply(root, arguments);
    };

    State.prototype.go = State.prototype.change;

    State.prototype.be = State.prototype.change;

    State.prototype.changeTo = function(target, options) {};

    State.prototype.goTo = State.prototype.changeTo;

    State.prototype.goto = State.prototype.goTo;

    State.prototype.data = function(via) {
      var attributes, mutation, residue, _base, _ref3, _ref4, _ref5;
      if (via == null) {
        via = VIA_ALL;
      }
      if (via !== via << 0) {
        mutation = via;
      }
      if (mutation) {
        attributes = this.attributes;
        if (attributes & INCIPIENT_OR_MUTABLE && !isEmpty(mutation)) {
          if (attributes & VIRTUAL) {
            return this.realize().data(mutation);
          }
          residue = delta((_base = this._).data || (_base.data = {}), mutation);
          if (!(attributes & ATOMIC) && residue && !isEmpty(residue)) {
            this.emit('mutate', [mutation, residue], VIA_PROTO);
          }
        }
        return this;
      } else {
        return clone(via & VIA_SUPER && ((_ref3 = this.superstate) != null ? _ref3.data() : void 0), via & VIA_PROTO && ((_ref4 = this.protostate()) != null ? _ref4.data(VIA_PROTO, (_ref5 = this._) != null ? _ref5.data : void 0) : void 0));
      }
    };

    State.prototype.has = function(key, via) {
      var data, viaProto, viaSuper, _ref3, _ref4, _ref5;
      if (via == null) {
        via = VIA_ALL;
      }
      viaSuper = via & VIA_SUPER;
      viaProto = via & VIA_PROTO;
      return !!((data = (_ref3 = this._) != null ? _ref3.data : void 0) && has(data, key) || viaProto && ((_ref4 = this.protostate()) != null ? _ref4.has(key, VIA_PROTO) : void 0) || viaSuper && ((_ref5 = this.superstate) != null ? _ref5.has(key, VIA_SUPER | viaProto) : void 0));
    };

    State.prototype.get = function(key, via) {
      var data, viaProto, viaSuper, _ref3, _ref4, _ref5;
      if (via == null) {
        via = VIA_ALL;
      }
      viaSuper = via & VIA_SUPER;
      viaProto = via & VIA_PROTO;
      return (data = (_ref3 = this._) != null ? _ref3.data : void 0) && lookup(data, key) || viaProto && ((_ref4 = this.protostate()) != null ? _ref4.get(key, VIA_PROTO) : void 0) || viaSuper && ((_ref5 = this.superstate) != null ? _ref5.get(key, VIA_SUPER | viaProto) : void 0);
    };

    State.prototype["let"] = function(key, value) {
      var attributes, data, displaced, mutation, residue, _base;
      attributes = this.attributes;
      if (!(attributes & INCIPIENT_OR_MUTABLE)) {
        return;
      }
      if (attributes & VIRTUAL) {
        return this.realize()["let"](key, value);
      }
      data = (_base = this._).data || (_base.data = {});
      if (value !== (displaced = lookup(data, key))) {
        assign = O.assign;
        assign(data, key, value);
        assign((mutation = {}).data = {}, key, value);
        assign((residue = {}).data = {}, key, displaced);
        this.emit('mutate', [mutation, residue], VIA_PROTO);
      }
      return value;
    };

    State.prototype.set = function(key, value) {
      var attributes, data, s;
      attributes = this.attributes;
      if (!(attributes & INCIPIENT_OR_MUTABLE)) {
        return;
      }
      if (attributes & VIRTUAL) {
        this.realize();
      }
      s = this;
      while (s) {
        if (s.attributes & MUTABLE && (data = s._.data) && key in data) {
          return s["let"](key, value);
        }
        s = s.superstate;
      }
      return this["let"](key, value);
    };

    State.prototype["delete"] = function(key) {
      if (!(this.attributes & MUTABLE)) {
        return;
      }
      return NIL === this["let"](key, NIL);
    };

    State.prototype.method = function(methodName, via, out, boxed) {
      var context, inherited, method, realized, record, table, viaProto, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      if (via == null) {
        via = VIA_ALL;
      }
      realized = ~this.attributes & VIRTUAL;
      while (true) {
        if (realized) {
          method = (_ref3 = this._) != null ? (_ref4 = _ref3.methods) != null ? _ref4[methodName] : void 0 : void 0;
          if (method != null) {
            context = this;
          } else if (record = (_ref5 = this._) != null ? (_ref6 = _ref5.__dispatch_table__) != null ? _ref6[methodName] : void 0 : void 0) {
            method = record[0], context = record[1];
          }
          if (method != null) {
            break;
          }
        }
        if ((viaProto = via & VIA_PROTO) && (method = (_ref7 = this.protostate()) != null ? _ref7.method(methodName, VIA_PROTO, out, true) : void 0)) {
          context = this;
          inherited = true;
          break;
        }
        if (via & VIA_SUPER && (method = (_ref8 = this.superstate) != null ? _ref8.method(methodName, VIA_SUPER | viaProto, out, true) : void 0)) {
          if (out != null) {
            context = out.context;
          }
          inherited = true;
          break;
        }
        context = null;
        break;
      }
      if (method != null) {
        if (typeof method === 'function') {
          context = null;
        }
        if (realized && inherited && useDispatchTables) {
          table = (_ref9 = this._) != null ? _ref9.__dispatch_table__ || (_ref9.__dispatch_table__ = {}) : void 0;
          table[methodName] = [method, context];
        }
        if (!boxed && method.type === 'state-bound-function') {
          method = method.fn;
        }
      }
      if (out != null) {
        out.method = method;
        out.context = context;
      }
      return method;
    };

    State.prototype.methodNames = function() {
      var methods, _ref3;
      if (methods = (_ref3 = this._) != null ? _ref3.methods : void 0) {
        return keys(methods);
      }
    };

    State.prototype.addMethod = function(methodName, fn) {
      var methods, owner, ownerMethod, root, _ref3, _ref4, _ref5;
      if (!(this.attributes & INCIPIENT_OR_MUTABLE)) {
        return;
      }
      if (typeof fn === 'object' && fn.type === 'state-fixed-function') {
        fn = fn.fn(this, this.protostate());
      }
      if (!(typeof fn === 'function' || (fn != null ? fn.type : void 0) === 'state-bound-function')) {
        throw new TypeError("Must supply a plain, bound, or fixed function");
      }
      owner = this.owner;
      if (!((_ref3 = (ownerMethod = owner[methodName])) != null ? _ref3.isDispatcher : void 0)) {
        root = this.root;
        owner[methodName] = createDispatcher(root.accessorName, methodName, ownerMethod);
        if ((ownerMethod != null) && this !== root) {
          methods = (_ref4 = root._) != null ? _ref4.methods || (_ref4.methods = {}) : void 0;
          methods[methodName] = ownerMethod;
        }
      }
      methods = (_ref5 = this._) != null ? _ref5.methods || (_ref5.methods = {}) : void 0;
      return methods[methodName] = fn;
    };

    State.prototype.removeMethod = function(methodName) {
      var fn, methods, _ref3;
      if (!(this.attributes & MUTABLE && (methods = (_ref3 = this._) != null ? _ref3.methods : void 0) && (fn = methods[methodName]))) {
        return;
      }
      delete methods[methodName];
      return fn;
    };

    State.prototype.hasMethod = function(methodName) {
      var method;
      return method = this.method(methodName);
    };

    State.prototype.hasOwnMethod = function(methodName) {
      return !!this.method(methodName, VIA_NONE);
    };

    State.prototype.apply = function(methodName, args) {
      var context, method, out, record, _ref3, _ref4;
      if (record = (_ref3 = this._) != null ? (_ref4 = _ref3.__dispatch_table__) != null ? _ref4[methodName] : void 0 : void 0) {
        method = record[0], context = record[1];
        if ((method != null ? method.type : void 0) === 'state-bound-function') {
          method = method.fn;
        }
      }
      if (method == null) {
        if (method = this.method(methodName, VIA_ALL, out = {})) {
          context = out.context;
        } else {
          this.emit('noSuchMethod', [methodName, args]);
          this.emit('noSuchMethod:' + methodName, args);
          return;
        }
      }
      return method.apply(context || this.owner, args);
    };

    State.prototype.call = function() {
      var args, methodName;
      methodName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return this.apply(methodName, args);
    };

    State.prototype.event = function(eventType, id) {
      var emitter, _ref3, _ref4;
      if (!(emitter = (_ref3 = this._) != null ? (_ref4 = _ref3.events) != null ? _ref4[eventType] : void 0 : void 0)) {
        return;
      }
      if (id === void 0) {
        return emitter.length;
      }
      if (typeof id === 'function') {
        id = emitter.key(id);
      }
      return emitter.get(id);
    };

    State.prototype.addEvent = function(eventType, fn, context) {
      var events, _base;
      if (this.attributes & VIRTUAL) {
        this.realize();
      }
      events = (_base = this._).events || (_base.events = {});
      if (!hasOwn.call(events, eventType)) {
        events[eventType] = new StateEventEmitter(this);
      }
      if (fn.type === 'state-fixed-function') {
        fn = fn.fn(this, this.protostate());
      }
      return events[eventType].add(fn, context);
    };

    State.prototype.on = State.prototype.addEvent;

    State.prototype.removeEvent = function(eventType, id) {
      var _ref3, _ref4;
      return (_ref3 = this._) != null ? (_ref4 = _ref3.events) != null ? _ref4[eventType].remove(id) : void 0 : void 0;
    };

    State.prototype.off = State.prototype.removeEvent;

    State.prototype.emit = function(eventType, args, context, via) {
      var ss, _ref3, _ref4, _ref5, _ref6, _ref7;
      if (via == null) {
        via = VIA_ALL;
      }
      if (typeof eventType !== 'string') {
        return;
      }
      if (typeof args === 'number') {
        via = context;
        context = args;
        args = void 0;
      }
      if (typeof context === 'number') {
        via = context;
        context = void 0;
      }
      if ((args != null) && !isArray(args)) {
        args = [args];
      }
      if ((_ref3 = this._) != null) {
        if ((_ref4 = _ref3.events) != null) {
          if ((_ref5 = _ref4[eventType]) != null) {
            _ref5.emit(args, context || this);
          }
        }
      }
      if (via & VIA_PROTO) {
        if ((_ref6 = this.protostate()) != null) {
          _ref6.emit(eventType, args, context || this, VIA_PROTO);
        }
      }
      if (via & VIA_SUPER) {
        if ((_ref7 = (ss = this.superstate)) != null) {
          _ref7.emit(eventType, args, context || ss);
        }
      }
    };

    State.prototype.trigger = State.prototype.emit;

    State.prototype.guard = function(guardType) {
      var guard, _ref3, _ref4, _ref5;
      if (guard = (_ref3 = this._) != null ? (_ref4 = _ref3.guards) != null ? _ref4[guardType] : void 0 : void 0) {
        return clone(guard);
      } else {
        return ((_ref5 = this.protostate()) != null ? _ref5.guard(guardType) : void 0) || void 0;
      }
    };

    State.prototype.addGuard = function(guardType, guard) {
      var attributes, guards, _base;
      attributes = this.attributes;
      if (!(attributes & INCIPIENT_OR_MUTABLE)) {
        return;
      }
      if (attributes & VIRTUAL) {
        this.realize();
      }
      guards = (_base = this._).guards || (_base.guards = {});
      return edit(guards[guardType] || (guards[guardType] = {}), guard);
    };

    State.prototype.removeGuard = function() {
      var args, attributes, entry, guard, guardType, guards, key, _i, _len, _ref3;
      guardType = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      attributes = this.attributes;
      if (attributes & VIRTUAL) {
        return;
      }
      if (!(attributes & MUTABLE && (guards = this._.guards))) {
        return;
      }
      if (!(guard = guards[guardType])) {
        return null;
      }
      if (!args.length) {
        return (delete guards[guardType] ? guard : void 0);
      }
      _ref3 = flatten(args);
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        key = _ref3[_i];
        if (!(typeof key === 'string')) {
          continue;
        }
        entry = guard[key];
        if (delete guard[key]) {
          return entry;
        }
      }
    };

    State.prototype.substate = function(name, via) {
      var s, ss, _ref3, _ref4, _ref5;
      if (via == null) {
        via = VIA_PROTO;
      }
      s = this.root._current;
      while ((s != null ? s.attributes : void 0) & VIRTUAL && (ss = s.superstate)) {
        if (ss === this && s.name === name) {
          return s;
        }
        s = ss;
      }
      return ((_ref3 = this._) != null ? (_ref4 = _ref3.substates) != null ? _ref4[name] : void 0 : void 0) || via & VIA_PROTO && ((_ref5 = this.protostate()) != null ? _ref5.substate(name) : void 0);
    };

    State.prototype.substates = function(deep, virtual) {
      var name, result, s, ss, substate, _ref3, _ref4;
      result = [];
      if (virtual && (s = this.root._current) && s.attributes & VIRTUAL && this.isSuperstateOf(s)) {
        while (s && s !== this && s.attributes & VIRTUAL && (ss = s.superstate)) {
          if (deep || ss === this) {
            result.unshift(s);
          }
          s = ss;
        }
      }
      _ref4 = (_ref3 = this._) != null ? _ref3.substates : void 0;
      for (name in _ref4) {
        if (!__hasProp.call(_ref4, name)) continue;
        substate = _ref4[name];
        result.push(substate);
        if (deep) {
          result = result.concat(substate.substates(true));
        }
      }
      return result;
    };

    State.prototype.addSubstate = function(name, expression) {
      var attributes, substate, substates, _base;
      attributes = this.attributes;
      if (!(attributes & INCIPIENT)) {
        if (attributes & FINITE) {
          return;
        }
        if (!(attributes & MUTABLE)) {
          return;
        }
      }
      if (attributes & VIRTUAL) {
        this.realize();
      }
      substates = (_base = this._).substates || (_base.substates = {});
      if (substate = substates[name]) {
        substate.destroy();
      }
      substate = expression instanceof State ? expression.superstate === this ? expression.realize() : void 0 : new State(this, name, expression);
      if (!substate) {
        return null;
      }
      return substates[name] = substate;
    };

    State.prototype.removeSubstate = function(name) {
      var attributes, substate, substates, transition, _ref3;
      attributes = this.attributes;
      if (attributes & VIRTUAL) {
        return;
      }
      substates = (_ref3 = this._) != null ? _ref3.substates : void 0;
      if (!(substate = substates != null ? substates[name] : void 0)) {
        return;
      }
      if (!(attributes & MUTABLE || (substate != null ? substate.attributes : void 0) & DESTROYED)) {
        return;
      }
      if ((transition = this.root._transition) && (substate.isSuperstateOf(transition) || substate === transition.origin || substate === transition.target)) {
        return false;
      }
      if (this.root._current.isIn(substate)) {
        this.change(this, {
          forced: true
        });
      }
      delete substates[name];
      return substate;
    };

    State.prototype.transition = function(name) {
      var _ref3, _ref4;
      return (_ref3 = this._) != null ? (_ref4 = _ref3.transitions) != null ? _ref4[name] : void 0 : void 0;
    };

    State.prototype.transitions = function() {
      var _ref3;
      return clone((_ref3 = this._) != null ? _ref3.transitions : void 0);
    };

    State.prototype.addTransition = function(name, expression) {
      var attributes, transitions, _base;
      attributes = this.attributes;
      if (!(attributes & INCIPIENT_OR_MUTABLE)) {
        return;
      }
      if (attributes & VIRTUAL) {
        this.realize();
      }
      if (!(expression instanceof TransitionExpression)) {
        expression = new TransitionExpression(expression);
      }
      transitions = (_base = this._).transitions || (_base.transitions = {});
      return transitions[name] = expression;
    };

    State.prototype.removeTransition = function(name) {
      var attributes, transition, transitions;
      attributes = this.attributes;
      if (attributes & VIRTUAL) {
        return;
      }
      if (!(attributes & MUTABLE && (transitions = this._.transitions))) {
        return;
      }
      transition = transitions[name];
      if (transition) {
        delete transitions[name];
      }
      return transition;
    };

    return State;

  })();

  State.prototype.Content = require('./state-content');

  State.prototype.Expression = StateExpression = require('./state-expression');

  StateEventEmitter = require('./state-event-emitter');

  TransitionExpression = require('./transition-expression');

}).call(this);

},{"./state-function":2,"./state-content":9,"./state-expression":4,"./state-event-emitter":10,"./transition-expression":7,"omicron":11}],10:[function(require,module,exports){

(function() {
  var O, State, StateEventEmitter, state,
    __hasProp = {}.hasOwnProperty;

  state = require('./state-function');

  State = require('./state');

  O = state.O;

  module.exports = StateEventEmitter = (function() {
    var guid, isArray;

    isArray = O.isArray;

    guid = 0;

    function StateEventEmitter(state) {
      this.state = state;
      this.items = {};
      this.length = 0;
    }

    StateEventEmitter.prototype.get = function(id) {
      return this.items[id];
    };

    StateEventEmitter.prototype.getAll = function() {
      var key, value, _ref, _results;
      _ref = this.items;
      _results = [];
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        value = _ref[key];
        _results.push(value);
      }
      return _results;
    };

    StateEventEmitter.prototype.set = function(id, callback) {
      var items;
      items = this.items;
      if (!(id in items)) {
        this.length += 1;
      }
      items[id] = callback;
      return id;
    };

    StateEventEmitter.prototype.key = function(callback) {
      var key, value;
      if ((function() {
        var _ref, _results;
        _ref = this.items;
        _results = [];
        for (key in _ref) {
          if (!__hasProp.call(_ref, key)) continue;
          value = _ref[key];
          _results.push(value === callback);
        }
        return _results;
      }).call(this)) {
        return key;
      }
    };

    StateEventEmitter.prototype.keys = function() {
      var key, _ref, _results;
      _ref = this.items;
      _results = [];
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        _results.push(key);
      }
      return _results;
    };

    StateEventEmitter.prototype.add = function(callback, context) {
      var id;
      id = guid += 1;
      this.items[id] = context != null ? [callback, context] : callback;
      this.length += 1;
      return id;
    };

    StateEventEmitter.prototype.on = StateEventEmitter.prototype.bind = StateEventEmitter.prototype.add;

    StateEventEmitter.prototype.remove = function(id) {
      var callback, items;
      items = this.items;
      callback = items[typeof id === 'function' ? this.key(id) : id];
      if (!callback) {
        return false;
      }
      delete items[id];
      this.length -= 1;
      return callback;
    };

    StateEventEmitter.prototype.off = StateEventEmitter.prototype.unbind = StateEventEmitter.prototype.remove;

    StateEventEmitter.prototype.empty = function() {
      var n;
      if (!(n = this.length)) {
        return 0;
      }
      this.items = {};
      this.length = 0;
      return n;
    };

    StateEventEmitter.prototype.emit = function(args, autostate) {
      var context, eventualTarget, fn, item, key, owner, protostate, _ref;
      if (autostate == null) {
        autostate = this.state;
      }
      if (!(owner = autostate != null ? autostate.owner : void 0)) {
        throw TypeError;
      }
      protostate = autostate.protostate();
      _ref = this.items;
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        item = _ref[key];
        fn = context = null;
        if (typeof item === 'string' || item instanceof State) {
          eventualTarget = item;
          continue;
        }
        if (typeof item === 'function') {
          fn = item;
        } else if (isArray(item)) {
          fn = item[0], context = item[1];
        } else if ((item != null ? item.type : void 0) === 'state-bound-function') {
          fn = item.fn;
          context || (context = autostate);
        }
        fn.apply(context || owner, args);
      }
      if (eventualTarget) {
        return this.state.change(eventualTarget);
      }
    };

    StateEventEmitter.prototype.trigger = StateEventEmitter.prototype.emit;

    StateEventEmitter.prototype.destroy = function() {
      this.empty();
      this.state = this.items = null;
      return true;
    };

    return StateEventEmitter;

  })();

}).call(this);

},{"./state-function":2,"./state":3}],4:[function(require,module,exports){

(function() {
  var GUARD_ACTIONS, O, STATE_ATTRIBUTES, STATE_ATTRIBUTE_MODIFIERS, STATE_EVENT_TYPES, STATE_EXPRESSION_CATEGORIES, State, StateExpression, TransitionExpression, state,
    __hasProp = {}.hasOwnProperty;

  O = require('omicron');

  state = require('./state-function');

  State = require('./state');

  TransitionExpression = require('./transition-expression');

  STATE_ATTRIBUTES = state.STATE_ATTRIBUTES, STATE_ATTRIBUTE_MODIFIERS = state.STATE_ATTRIBUTE_MODIFIERS, STATE_EXPRESSION_CATEGORIES = state.STATE_EXPRESSION_CATEGORIES, STATE_EVENT_TYPES = state.STATE_EVENT_TYPES, GUARD_ACTIONS = state.GUARD_ACTIONS;

  module.exports = StateExpression = (function() {
    var NIL, NORMAL, assign, attributeFlags, attributeMap, categoryMap, clone, decodeAttributes, edit, encodeAttributes, eventTypes, guardActions, interpret, invert, isArray, isNumber, isPlainObject, untype;

    NIL = O.NIL, isNumber = O.isNumber, isPlainObject = O.isPlainObject, isArray = O.isArray;

    assign = O.assign, edit = O.edit, clone = O.clone, invert = O.invert;

    NORMAL = STATE_ATTRIBUTES.NORMAL;

    attributeMap = (function() {
      var key, object, value, _ref;
      _ref = object = assign(STATE_ATTRIBUTE_MODIFIERS);
      for (key in _ref) {
        value = _ref[key];
        object[key] = key.toUpperCase();
      }
      return object;
    })();

    attributeFlags = (function() {
      var key, object, value, _ref;
      _ref = object = invert(STATE_ATTRIBUTES);
      for (key in _ref) {
        value = _ref[key];
        object[key] = value.toLowerCase();
      }
      return object;
    })();

    categoryMap = assign(STATE_EXPRESSION_CATEGORIES);

    eventTypes = assign(STATE_EVENT_TYPES);

    guardActions = assign(GUARD_ACTIONS);

    function StateExpression(attributes, map) {
      if (typeof attributes === 'string') {
        map || (map = {});
      } else if (!map) {
        map = attributes;
        attributes = void 0;
      }
      if (!(map instanceof StateExpression)) {
        map = interpret(map);
      }
      edit('deep all', this, map);
      if (attributes != null) {
        if (!isNumber(attributes)) {
          attributes = encodeAttributes(attributes);
        }
      } else {
        if (map) {
          attributes = map.attributes;
        }
      }
      this.attributes = attributes || NORMAL;
    }

    interpret = function(map) {
      var category, item, key, object, result, type, value, _ref, _ref1, _ref2, _ref3;
      result = assign(STATE_EXPRESSION_CATEGORIES, null);
      for (key in map) {
        if (!__hasProp.call(map, key)) continue;
        value = map[key];
        if (value === state) {
          value = new StateExpression;
        }
        category = value instanceof StateExpression ? 'states' : value instanceof TransitionExpression ? 'transitions' : void 0;
        if (category) {
          item = result[category] || (result[category] = {});
          item[key] = value;
        } else if (key in result && value) {
          result[key] = clone(result[key], value);
        } else {
          category = (eventTypes[key] != null) || typeof value === 'string' ? 'events' : guardActions[key] != null ? 'guards' : typeof value === 'function' || (type = value != null ? value.type : void 0) && (type === 'state-bound-function' || type === 'state-fixed-function') ? 'methods' : value === NIL || isPlainObject(value) ? 'states' : void 0;
          if (category) {
            item = result[category] || (result[category] = {});
            item[key] = value;
          }
        }
      }
      _ref = object = result.events;
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        value = _ref[key];
        if (!isArray(value)) {
          object[key] = [value];
        }
      }
      _ref1 = object = result.guards;
      for (key in _ref1) {
        if (!__hasProp.call(_ref1, key)) continue;
        value = _ref1[key];
        if (!isPlainObject(value)) {
          object[key] = {
            '*': value
          };
        }
      }
      _ref2 = object = result.transitions;
      for (key in _ref2) {
        if (!__hasProp.call(_ref2, key)) continue;
        value = _ref2[key];
        if (!(value === NIL || value instanceof TransitionExpression)) {
          object[key] = new TransitionExpression(value);
        }
      }
      _ref3 = object = result.states;
      for (key in _ref3) {
        if (!__hasProp.call(_ref3, key)) continue;
        value = _ref3[key];
        if (value instanceof State) {
          object[key] = value.express(true);
        } else if (!(value === NIL || value instanceof StateExpression)) {
          object[key] = new StateExpression(value);
        }
      }
      return result;
    };

    StateExpression.encodeAttributes = encodeAttributes = function(attributes) {
      var key, result, value;
      if (typeof attributes === 'string') {
        attributes = assign(attributes);
      }
      result = NORMAL;
      for (key in attributes) {
        if (!__hasProp.call(attributes, key)) continue;
        value = attributes[key];
        if (key in attributeMap) {
          result |= STATE_ATTRIBUTES[attributeMap[key]];
        }
      }
      return result;
    };

    StateExpression.decodeAttributes = decodeAttributes = function(number) {
      var key, value;
      return ((function() {
        var _results;
        _results = [];
        for (key in attributeFlags) {
          value = attributeFlags[key];
          if (number & key) {
            _results.push(value);
          }
        }
        return _results;
      })()).join(' ');
    };

    StateExpression.untype = untype = function(expr) {
      var key, name, result, s, subexpr, value, _ref;
      result = {};
      for (key in expr) {
        if (!__hasProp.call(expr, key)) continue;
        value = expr[key];
        result[key] = value;
      }
      _ref = s = result.states;
      for (name in _ref) {
        subexpr = _ref[name];
        s[name] = untype(subexpr);
      }
      return result;
    };

    return StateExpression;

  })();

}).call(this);

},{"./state-function":2,"./state":3,"./transition-expression":7,"omicron":11}],5:[function(require,module,exports){

(function() {
  var O, RootState, State, StateExpression, Transition, TransitionExpression, state,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  O = require('omicron');

  state = require('./state-function');

  State = require('./state');

  StateExpression = null;

  Transition = null;

  TransitionExpression = null;

  module.exports = RootState = (function(_super) {
    var ABSTRACT, CONCLUSIVE, FINAL, VIA_NONE, VIA_PROTO, VIRTUAL, createAccessor, env, evaluateGuard, hasOwn, isArray, isEmpty, rxTransitionArrow, slice, transitionArrowMethods, trim;

    __extends(RootState, _super);

    rxTransitionArrow = state.rxTransitionArrow, transitionArrowMethods = state.transitionArrowMethods;

    env = O.env, hasOwn = O.hasOwn, trim = O.trim, isEmpty = O.isEmpty, isArray = O.isArray;

    slice = Array.prototype.slice;

    VIRTUAL = RootState.VIRTUAL, ABSTRACT = RootState.ABSTRACT, CONCLUSIVE = RootState.CONCLUSIVE, FINAL = RootState.FINAL;

    VIA_NONE = RootState.VIA_NONE, VIA_PROTO = RootState.VIA_PROTO;

    function RootState(owner, expression, options) {
      var accessorName, current, initial;
      this.owner = owner || (owner = {});
      if (!(expression instanceof StateExpression)) {
        expression = new StateExpression(expression);
      }
      if (typeof options === 'string') {
        options = {
          initialState: options
        };
      }
      this.accessorName = accessorName = (options != null ? options.name : void 0) || 'state';
      owner[accessorName] = createAccessor(owner, accessorName, this);
      RootState.__super__.constructor.call(this, owner, this.name = '', expression);
      current = (initial = options != null ? options.initialState : void 0) ? this.query(initial) : this.initialSubstate() || this;
      if (current.attributes & ABSTRACT) {
        current = current.defaultSubstate() || current;
      }
      if (current.root !== this) {
        current = current.virtualize(this);
      }
      this._current = current;
      this._transition = null;
    }

    createAccessor = function(owner, name, root) {
      var accessor;
      accessor = function() {
        var args, current, input, match, method;
        input = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        current = root._current;
        if (this === owner) {
          if (input == null) {
            return current;
          }
          if (typeof input === 'function') {
            return current.change(input.call(this));
          }
          if (typeof input === 'string' && (match = input.match(rxTransitionArrow)) && (method = transitionArrowMethods[match[1]])) {
            if (args.length) {
              return current[method].apply(current, [match[2]].concat(args));
            } else {
              return current[method](match[2]);
            }
          }
          return current.query.apply(current, arguments);
        } else if ((owner.isPrototypeOf(this)) && ((!hasOwn.call(this, name)) || this[name] === owner[name])) {
          new RootState(this, null, {
            name: name,
            initialState: current.path()
          });
          return this[name].apply(this, arguments);
        }
      };
      accessor.isAccessor = true;
      if (env.debug) {
        accessor.toString = function() {
          return "[accessor] -> " + (root._current.path());
        };
      }
      return accessor;
    };

    evaluateGuard = function(context, guard, against) {
      var args, key, result, selector, selectors, value, valueIsFn, _i, _len;
      if (typeof guard === 'string') {
        guard = context.guard(guard);
      }
      if (!guard) {
        return true;
      }
      args = slice.call(arguments, 1);
      for (key in guard) {
        if (!__hasProp.call(guard, key)) continue;
        value = guard[key];
        valueIsFn = typeof value === 'function';
        selectors = trim(key).split(/\s*,+\s*/);
        for (_i = 0, _len = selectors.length; _i < _len; _i++) {
          selector = selectors[_i];
          if (!(context.query(selector, against))) {
            continue;
          }
          result = valueIsFn ? value.apply(context, args) : value;
          break;
        }
        if (!result) {
          break;
        }
      }
      return !!result;
    };

    RootState.prototype.getTransitionExpression = (function() {
      var search;
      search = function(target, origin, subject, ceiling) {
        var admit, expr, guards, key, release, _ref;
        while (subject && subject !== ceiling) {
          _ref = subject.transitions();
          for (key in _ref) {
            if (!__hasProp.call(_ref, key)) continue;
            expr = _ref[key];
            if ((!(guards = expr.guards) || (!(admit = guards.admit) || isEmpty(admit) || evaluateGuard.call(origin, admit, target, origin)) && (!(release = guards.release) || isEmpty(release) || evaluateGuard.call(target, release, origin, target))) && (expr.target ? subject.query(expr.target, target) : subject === target) && (!expr.origin || subject.query(expr.origin, origin))) {
              return expr;
            }
          }
          if (ceiling == null) {
            break;
          }
          subject = subject.superstate;
        }
      };
      return function(target, origin) {
        if (origin == null) {
          origin = this._current;
        }
        return (search(target, origin, target)) || (origin !== target ? search(target, origin, origin) : void 0) || (search(target, origin, target.superstate, this.root)) || (search(target, origin, this.root)) || (!target.isIn(origin) ? search(target, origin, origin.superstate, origin.common(target)) : void 0) || new TransitionExpression;
      };
    })();

    RootState.prototype.change = function(target, options) {
      var admitted, args, current, domain, eventArgs, origin, owner, released, root, s, source, targetOwner, transition, _ref;
      root = this.root, owner = this.owner;
      current = this._current;
      transition = this._transition;
      origin = (transition != null ? transition.origin : void 0) || current;
      if (origin.attributes & FINAL) {
        return null;
      }
      if (!(target instanceof State)) {
        target = target ? origin.query(target) : root;
      }
      if (!target) {
        return null;
      }
      targetOwner = target.owner;
      if (owner !== targetOwner && !targetOwner.isPrototypeOf(owner)) {
        return null;
      }
      if (isArray(options)) {
        options = {
          args: options
        };
      }
      args = options != null ? options.args : void 0;
      while (target.attributes & ABSTRACT) {
        if (!(target = target.defaultSubstate())) {
          return null;
        }
      }
      if (!(options != null ? options.forced : void 0)) {
        released = evaluateGuard(origin, 'release', target);
        admitted = evaluateGuard(target, 'admit', origin);
        if (!(released && admitted)) {
          if (options != null) {
            if ((_ref = options.failure) != null) {
              if (typeof _ref.call === "function") {
                _ref.call(this);
              }
            }
          }
          return null;
        }
      }
      if ((target != null ? target.root : void 0) !== root) {
        target = target.virtualize(this);
      }
      source = current;
      domain = source.common(target);
      s = source;
      while (s !== domain) {
        if (s.attributes & CONCLUSIVE) {
          return null;
        }
        s = s.superstate;
      }
      if (transition != null) {
        transition.abort();
      }
      this._transition = transition = new Transition(target, source, this.getTransitionExpression(target, origin));
      eventArgs = [transition, args];
      source.emit('depart', eventArgs, VIA_PROTO);
      if (transition.aborted) {
        this._transition = transition = null;
      }
      if (transition) {
        this._current = transition;
        transition.emit('enter', VIA_NONE);
        if (transition.aborted) {
          this._transition = transition = null;
        }
      }
      s = source;
      while (transition && s !== domain) {
        s.emit('exit', eventArgs, VIA_PROTO);
        transition.superstate = s = s.superstate;
        if (transition.aborted) {
          this._transition = transition = null;
        }
      }
      if (transition != null) {
        transition.callback = function() {
          var pathToState, ss, substate, _ref1;
          if (transition.aborted) {
            transition = null;
          }
          if (transition) {
            s = target;
            pathToState = [];
            while (s !== domain) {
              pathToState.push(s);
              s = s.superstate;
            }
          }
          s = domain;
          while (transition && (substate = pathToState.pop())) {
            transition.superstate = substate;
            substate.emit('enter', eventArgs, VIA_PROTO);
            if (transition.aborted) {
              transition = null;
            }
            s = substate;
          }
          if (transition) {
            transition.emit('exit', VIA_NONE);
            if (transition.aborted) {
              transition = null;
            }
          }
          if (transition) {
            this._current = target;
            target.emit('arrive', eventArgs, VIA_PROTO);
            s = origin;
            while (s.attributes & VIRTUAL) {
              ss = s.superstate;
              s.destroy();
              s = ss;
            }
            transition.destroy();
            this._transition = transition = null;
            if (options != null) {
              if ((_ref1 = options.success) != null) {
                if (typeof _ref1.call === "function") {
                  _ref1.call(this);
                }
              }
            }
            return target;
          }
          return null;
        };
      }
      return (transition != null ? transition.start.apply(transition, args) : void 0) || this._current;
    };

    return RootState;

  })(State);

  StateExpression = require('./state-expression');

  Transition = require('./transition');

  TransitionExpression = require('./transition-expression');

}).call(this);

},{"./state-function":2,"./state":3,"./state-expression":4,"./transition":6,"./transition-expression":7,"omicron":11}],11:[function(require,module,exports){
(function(){// Copyright (C) 2011-2012
// Nick Fargo, Z Vector Inc.
//
// [`LICENSE`](https://github.com/nickfargo/omicron/blob/master/LICENSE) MIT.
//
// Omicron (**“O”**) is a small JavaScript library of functions and tools that
// assist with:
//
// * Object manipulation and differential operations
// * Prototypal inheritance
// * Selected general tasks: safe typing, functional iteration, etc.
//
// [omicronjs.org](http://omicronjs.org/)
//
// <a class="icon-large icon-octocat"
//    href="http://github.com/nickfargo/omicron/"></a>

;( function ( undefined ) {

var global = this;

var O = {
    VERSION: '0.1.9',
    env: {
        server: typeof module !== 'undefined' &&
                typeof require !== 'undefined' &&
                !!module.exports,
        client: typeof window !== 'undefined' && window === global,
        debug:  false
    }
};

var rxWhitespace = /\s+/;

var regexp = O.regexp = {
    whitespace: rxWhitespace
};

// #### [NIL](#nil)
//
// Unique object reference. Used by [`edit`](#edit) and the related
// differential operation functions, where an object with a property whose
// value is set to `NIL` indicates the absence or deletion of the
// corresponding property on an associated operand.
var NIL = O.NIL = ( function () { function NIL () {} return new NIL; }() );

// #### [toString](#to-string)
//
var toString = O.toString =
    Object.prototype.toString;

// #### [hasOwn](#has-own)
//
var hasOwn = O.hasOwn =
    Object.prototype.hasOwnProperty;

// #### [trim](#trim)
//
var trim = O.trim =
    String.prototype.trim ?
        function ( text ) {
            return text == null ? '' : String.prototype.trim.call( text );
        } :
        function ( text ) {
            return text == null ?
                '' :
                text.toString()
                    .replace( /^\s+/, '' )
                    .replace( /\s+$/, '' );
        };

// #### [slice](#slice)
//
var slice = O.slice =
    Array.prototype.slice;


// #### [noConflict](#no-conflict)
//
O.noConflict = ( function () {
    var autochthon = global.O;
    return function () {
        global.O = autochthon;
        return this;
    };
}() );

// #### [noop](#noop)
//
// General-purpose empty function.
function noop () {}
O.noop = noop;

// #### [getThis](#get-this)
//
// Like [`noop`](#noop), except suited for substitution on methods that would
// normally return their context object.
function getThis () { return this; }
O.getThis = getThis;

// Calls the specified native function if it exists and returns its result; if
// no such function exists on `obj` as registered in `__native.fn`, the unique
// [`NIL`](#nil) is returned (as opposed to `null` or `undefined`, either of
// which may be a valid result from the native function itself).
function __native ( item, obj /* , ... */ ) {
    var n = __native.fn[ item ];
    return n && obj[ item ] === n ?
        n.apply( obj, slice.call( arguments, 2 ) ) :
        NIL;
}
__native.fn = {
    forEach: Array.prototype.forEach,
    indexOf: Array.prototype.indexOf
};

// #### [type](#type)
//
// An established browser-safe alternative to `typeof` that checks against
// `Object.prototype.toString()`.
function type ( obj ) {
    return obj == null ?
        String( obj ) :
        type.map[ toString.call( obj ) ] || 'object';
}
type.map = {};
each( 'Array Boolean Date Function Number Object RegExp String'.split(' '),
    function( i, name ) {
        type.map[ "[object " + name + "]" ] = name.toLowerCase();
    });
O.type = type;

// #### [isBoolean](#is-boolean)
function isBoolean ( obj ) { return typeof obj === 'boolean'; }
O.isBoolean = isBoolean;

// #### [isString](#is-string)
function isString ( obj ) { return typeof obj === 'string'; }
O.isString = isString;

// #### [isNumber](#is-number)
function isNumber ( n ) { return !isNaN( parseFloat( n ) ) && isFinite( n ); }
O.isNumber = isNumber;

// #### [isArray](#is-array)
function isArray ( obj ) { return type( obj ) === 'array'; }
O.isArray = isArray;

// #### [isFunction](#is-function)
function isFunction ( obj ) { return typeof obj === 'function'; }
O.isFunction = isFunction;

// #### [isPlainObject](#is-plain-object)
//
// Near-straight port of jQuery `isPlainObject`.
function isPlainObject ( obj ) {
    var key;
    if ( !obj || type( obj ) !== 'object' || obj.nodeType || obj === global ||
        obj.constructor &&
        !hasOwn.call( obj, 'constructor' ) &&
        !hasOwn.call( obj.constructor.prototype, 'isPrototypeOf' )
    ) {
        return false;
    }
    for ( key in obj ) {}
    return key === undefined || hasOwn.call( obj, key );
}
O.isPlainObject = isPlainObject;

// #### [isEmpty](#is-empty)
//
// Returns a boolean indicating whether the object or array at `obj` contains
// any members. For an `Object` type, if `andPrototype` is included and truthy,
// `obj` must be empty throughout its prototype chain as well.
function isEmpty ( obj, andPrototype ) {
    var key;
    if ( isArray( obj ) && obj.length ) return false;
    for ( key in obj ) if ( andPrototype || hasOwn.call( obj, key ) ) {
        return false;
    }
    return true;
}
O.isEmpty = isEmpty;

// #### [isEqual](#is-equal)
//
// Performs a deep equality test.
function isEqual ( subject, object ) {
    return subject === object ||
        isEmpty( edit(
            'deep all absolute immutable delta', subject, object || {}
        ));
}
O.isEqual = isEqual;

// #### [each](#each)
//
// Functional iterator with jQuery-style callback signature of
// `key, value, object`.
function each ( obj, fn ) {
    if ( !obj ) return;
    var k, i, l = obj.length;
    if ( l === undefined || isFunction( obj ) ) {
        for ( k in obj ) {
            if ( fn.call( obj[k], k, obj[k], obj ) === false ) break;
        }
    } else {
        for ( i = 0, l = obj.length; i < l; ) {
            if ( fn.call( obj[i], i, obj[ i++ ], obj ) === false ) break;
        }
    }
    return obj;
}
O.each = each;

// #### [forEach](#for-each)
//
// Functional iterator with ES5-style callback signature of
// `value, key, object`.
function forEach ( obj, fn, context ) {
    var n, l, k, i;
    if ( obj == null ) return;
    if ( ( n = __native( 'forEach', obj, fn, context ) ) !== NIL ) return n;
    if ( ( l = obj.length ) === undefined || isFunction( obj ) ) {
        for ( k in obj ) {
            if ( fn.call( context || obj[k], obj[k], k, obj ) === false ) {
                break;
            }
        }
    } else {
        for ( i = 0, l = obj.length; i < l; ) {
            if ( fn.call( context || obj[i], obj[i], i++, obj ) === false ) {
                break;
            }
        }
    }
    return obj;
}
O.forEach = forEach;

// #### [edit](#edit)
//
// Performs a differential operation across multiple objects.
//
// By default, `edit` returns the first object-typed argument as `subject`, to
// which each subsequent `source` argument is copied in order. Optionally the
// first argument may be either a Boolean `deep`, or a whitespace-delimited
// `flags` String containing any of the following keywords:
//
// * `deep` : If a `source` property is an object or array, a structured clone
//      is created on `subject`.
//
// * `own` : Excludes `source` properties filtered by `Object.hasOwnProperty`.
//
// * `all` : Includes `source` properties with values of `NIL` or `undefined`.
//
// * `delta` : Returns the **delta**, a structured object that reflects the
//      changes made to the properties of `subject`. If multiple object
//      arguments are provided, an array of deltas is returned. (Applying the
//      deltas in reverse order in an `edit('deep')` on `subject` would revert
//      the contents of `subject` to their original state.)
//
// * `immutable` : Leaves `subject` unchanged. Useful, for example, in
//      combination with flags `delta` and `absolute` for non-destructively
//      computing a differential between `source` and `subject`.
//
// * `absolute` : By default an edit operation is *relative*, in that the
//      properties of `subject` affected by the operation are limited to those
//      also present within each `source`. By including the `absolute` flag,
//      properties in `subject` that are *not* also present within each
//      `source` will be deleted from `subject`, and will also affect any
//      returned delta accordingly.
//
// Contains techniques and influences from the deep-cloning procedure of
// `jQuery.extend`, with which `edit` also retains a compatible interface.
//
// > See also: [`clone`](#clone), [`delta`](#delta), [`diff`](#diff),
// [`assign`](#assign)
function edit () {
    var i, l, t, flags, flagsString, subject, subjectIsArray, deltas, delta,
        key, value, valueIsArray, source, target, clone, result;

    i = 0; l = arguments.length;
    t = type( arguments[0] );

    if ( t === 'boolean' ) {
        flagsString = 'deep';
        flags = { deep: flagsString };
        i += 1;
    } else if ( t === 'string' ) {
        flagsString = arguments[i];
        flags = assign( flagsString );
        i += 1;
    } else {
        flags = NIL;
    }

    subject = arguments[i] || {};
    i += 1;
    typeof subject === 'object' || isFunction( subject ) || ( subject = {} );
    subjectIsArray = isArray( subject );

    flags.delta && l - 1 > i && ( deltas = [] );

    for ( ; i < l; i++ ) {
        flags.delta && ( delta = subjectIsArray ? [] : {} );
        deltas && deltas.push( delta );
        source = arguments[i];

        if ( source == null ) continue;

        for ( key in source ) if ( !flags.own || hasOwn.call( source, key ) ) {
            value = source[ key ];
            if ( value === subject ) continue;
            if ( value === NIL && !flags.all ) {
                delta && ( delta[ key ] = subject[ key ] );
                flags.immutable || delete subject[ key ];
            }
            else if ( flags.deep && value && ( isPlainObject( value ) ||
                ( valueIsArray = isArray( value ) ) )
            ) {
                target = subject[ key ];
                if ( valueIsArray ) {
                    valueIsArray = false;
                    clone = target && isArray( target ) ?
                        target :
                        [];
                } else {
                    clone = target && ( isFunction( target ) ||
                            typeof target === 'object' ) ?
                        target :
                        {};
                }
                result = edit( flagsString, clone, value );
                if ( delta ) {
                    if ( hasOwn.call( subject, key ) ) {
                        if ( result && !isEmpty( result ) ) {
                            delta[ key ] = result;
                        }
                    } else {
                        delta[ key ] = NIL;
                    }
                }
                flags.immutable || ( subject[ key ] = clone );
            }
            else if ( ( value !== undefined || flags.all ) &&
                ( !hasOwn.call( subject, key ) || subject[ key ] !== value )
            ) {
                if ( delta ) {
                    delta[ key ] = hasOwn.call( subject, key ) ?
                        subject[ key ] :
                        NIL;
                }
                flags.immutable || ( subject[ key ] = value );
            }
        }
        if ( flags.absolute && ( flags.delta || !flags.immutable ) ) {
            for ( key in subject ) if ( hasOwn.call( subject, key ) ) {
                if ( !( flags.own ?
                            hasOwn.call( source, key ) :
                            key in source )
                ) {
                    delta && ( delta[ key ] = subject[ key ] );
                    flags.immutable || delete subject[ key ];
                }
            }
        }
    }
    return deltas || delta || subject;
}
O.edit = O.extend = edit;

// #### [clone](#clone)
//
// Specialization of [`edit`](#edit).
function clone () {
    return edit.apply( O, [ 'deep all', isArray( arguments[0] ) ? [] : {} ]
        .concat( slice.call( arguments ) ) );
}
O.clone = clone;

// #### [delta](#delta)
//
// Specialization of [`edit`](#edit) that applies changes defined in `source`
// to `subject`, and returns the **anti-delta**: a structured map containing
// the properties of `subject` displaced by the operation. Previously
// nonexistent properties are recorded as [`NIL`](#nil) in the anti-delta.
// The prior condition of `subject` can be restored in a single transaction
// by immediately providing this anti-delta object as the `source` argument in
// a subsequent `edit` operation upon `subject`.
function delta () {
    return edit.apply( O, [ 'deep delta' ]
        .concat( slice.call( arguments ) ) );
}
O.delta = delta;

// #### [diff](#diff)
//
// Specialization of [`edit`](#edit) that returns the delta between the
// provided `subject` and `source`. Operates similarly to [`delta`] except no
// changes are made to `subject`, and `source` is evaluated absolutely rather
// than applied relatively.
function diff () {
    return edit.apply( O, [ 'deep delta immutable absolute' ]
        .concat( slice.call( arguments ) ) );
}
O.diff = diff;

// #### [assign](#assign)
//
// Facilitates one or more assignments of a value to one or more keys of an
// object.
function assign ( target, map, value, separator ) {
    var argLen, valuesMirrorKeys, key, list, i, l;

    argLen = arguments.length;
    if ( typeof target === 'string' ) {
        valuesMirrorKeys = argLen === 1;
        value = map; map = target; target = {};
    } else {
        if ( typeof map === 'string' ) {
            if ( argLen === 2 ) {
                valuesMirrorKeys = true;
            } else {
                // `value` is present, and `map` is a key or "deep key";
                // do `lookup`-style assignment
                list = map.split( separator || '.' );
                for ( i = 0, l = list.length; i < l; i++ ) {

                    // To proceed `target` must be an `Object`.
                    if ( !target || typeof target !== 'object' &&
                        typeof target !== 'function' ) return;

                    key = list[i];

                    // If at the end of the deep-key, assign/delete and return.
                    // For deletions, return `NIL` to indicate a `true` result
                    // from the `delete` operator.
                    if ( i === l - 1 ) {
                        if ( value === NIL ) {
                            return delete target[ key ] ? NIL : undefined;
                        } else {
                            return target[ key ] = value;
                        }
                    }

                    // Advance `target` to the next level. If nothing is there
                    // already, then: for an assignment, create a new object in
                    // place and continue; for a deletion, return `NIL`
                    // immediately to reflect what would have been a `true`
                    // result from the `delete` operator.
                    if ( hasOwn.call( target, key ) ) {
                        target = target[ key ];
                    } else {
                        if ( value === NIL ) return NIL;
                        target = target[ key ] = {};
                    }
                }
            }
        }
        else if ( map === undefined ) {
            map = target; target = {};
        }
    }
    if ( typeof map === 'string' ) {
        key = map; ( map = {} )[ key ] = value;
    }

    for ( key in map ) if ( hasOwn.call( map, key ) ) {
        list = key.split( rxWhitespace );
        if ( valuesMirrorKeys ) {
            for ( i = 0, l = list.length; i < l; i++ ) {
                value = list[i];
                target[ value ] = value;
            }
        } else {
            value = map[ key ];
            for ( i = 0, l = list.length; i < l; i++ ) {
                target[ list[i] ] = value;
            }
        }
    }

    return target;
}

O.assign = assign;

// #### [flatten](#flatten)
//
// Extracts elements of nested arrays into a single flat array.
function flatten ( array ) {
    isArray( array ) || ( array = [ array ] );
    var i = 0,
        l = array.length,
        item,
        result = [];
    while ( i < l ) {
        item = array[ i++ ];
        if ( isArray( item ) ) {
            result = result.concat( flatten( item ) );
        } else {
            result.push( item );
        }
    }
    return result;
}
O.flatten = flatten;

// #### [indexOf](#index-of)
//
// Emulates (IE<9) or calls native `Array.prototype.indexOf`.
function indexOf ( array, target, startIndex ) {
    var n, i, l;
    if ( array == null ) return -1;
    if ( ( n = __native( 'indexOf', array, target ) ) !== NIL ) return n;
    for ( i = startIndex || 0, l = array.length; i < l; i++ ) {
        if ( i in array && array[i] === target ) return i;
    }
    return -1;
}
O.indexOf = indexOf;

// #### [unique](#unique)
//
// Returns a copy of `array` with any duplicate elements removed.
function unique ( array ) {
    var result, i, l, item;
    if ( !array ) return [];
    result = [];
    for ( i = 0, l = array.length; i < l; i++ ) {
        item = array[i];
        ~indexOf( result, item ) || result.push( item );
    }
    return result;
}
O.unique = O.uniq = unique;

// #### [keys](#keys)
//
// Returns an array containing the keys of a hashmap.
function keys ( obj ) {
    var key, result = [];
    if ( !( isPlainObject( obj ) || isFunction( obj ) ) ) {
        throw new TypeError;
    }
    for ( key in obj ) { hasOwn.call( obj, key ) && result.push( key ); }
    return result;
}
O.keys = isFunction( Object.keys ) ? Object.keys : keys;

// #### [invert](#invert)
//
// Returns a hashmap that is the key-value inversion of the supplied string
// array.
function invert ( obj ) {
    var i, l, map = {};
    if ( isArray( obj ) ) {
        for ( i = 0, l = obj.length; i < l; i++ ) map[ ''+obj[i] ] = i;
    } else {
        for ( i in obj ) if ( hasOwn.call( obj, i ) ) map[ ''+obj[i] ] = i;
    }
    return map;
}
O.invert = invert;

// #### [alias](#alias)
//
// Copies the values of members of an object to one or more different keys on
// that same object.
function alias ( object, map ) {
    var key, value, names, i, l;
    for ( key in map ) if ( key in object ) {
        names = map[ key ].split( rxWhitespace );
        for ( i = 0, l = names.length; i < l; i++ ) {
            object[ names[i] ] = object[ key ];
        }
    }
    return object;
}
O.alias = alias;

// #### [thunk](#thunk)
//
// Creates and returns a lazy evaluator, a function that returns the enclosed
// argument.
function thunk ( obj ) {
    return function () { return obj; };
}
O.thunk = thunk;

// #### [lookup](#lookup)
//
// Retrieves the value at the location indicated by the provided `path` string
// inside a nested object `obj`. For example:
//
//      var x = { a: { b: 42 } };
//      lookup( x, 'a' );        // { "b": 42 }
//      lookup( x, 'a.b' );      // 42
//      lookup( x, 'a.b.c' );    // undefined
//
function lookup ( obj, path, separator, ownProperty ) {
    var i, l, name;

    if ( obj == null || typeof path !== 'string' ) return;
    if ( typeof separator === 'boolean' && arguments.length < 4 ) {
        ownProperty = separator; separator = undefined;
    }
    path = path.split( separator || '.' );
    for ( i = 0, l = path.length; i < l && obj != null; i++ ) {
        if ( typeof obj !== 'object' && typeof obj !== 'function' ) return;
        name = path[i];
        if ( ownProperty && !hasOwn.call( obj, name ) ) return;
        obj = obj[ name ];
    }
    return obj;
}
O.lookup = lookup;

// #### [has](#has)
//
// Returns a boolean that verifies the existence of a key, indicated by the
// provided `path` string, within a nested object `obj`.
//
//      var x = { a: { b: 42 } };
//      has( x, 'a' );        // true
//      has( x, 'a.b' );      // true
//      has( x, 'a.b.c' );    // false
//
// > See also: [lookup](#lookup)
//
function has ( obj, path, separator, ownProperty ) {
    var i, l, name;

    if ( obj == null || typeof path !== 'string' ) return false;
    if ( typeof separator === 'boolean' && arguments.length < 4 ) {
        ownProperty = separator; separator = undefined;
    }

    separator || ( separator = '.' );
    if ( !~path.indexOf( separator ) ) {
        return ownProperty ? hasOwn.call( obj, path ) : path in obj;
    }

    path = path.split( separator );
    for ( i = 0, l = path.length; i < l && obj != null; i++ ) {
        if ( typeof obj !== 'object' && typeof obj !== 'function' ) {
            return false;
        }
        name = path[i];
        if ( ownProperty && !hasOwn.call( obj, name ) ) return false;
        if ( i === l - 1 ) return name in obj;
        obj = obj[ name ];
    }
    return false;
}
O.has = has;

// #### [create](#create)
//
// Reference to or partial shim for `Object.create`.
function create ( prototype ) {
    var object, constructor = function () {};
    constructor.prototype = prototype;
    object = new constructor;
    object.__proto__ = prototype;
    object.constructor = prototype.constructor;
    return object;
}
O.create = isFunction( Object.create ) ? Object.create : create;

// #### [inherit](#inherit)
//
// Facilitates prototypal inheritance between a `child` constructor and a
// `parent` constructor.
//
// * `child` and `parent` are constructor functions, such that
//       `new child instanceof parent === true`
// * `child` also inherits static members that are direct properties of
//       `parent`
// * `properties` is an object containing properties to be added to the
//       prototype of `child`
// * `statics` is an object containing properties to be added to `child`
//       itself.
function inherit (
    /*Function*/ child,
    /*Function*/ parent,      // optional
      /*Object*/ properties,  // optional
      /*Object*/ statics      // optional
) {
    if ( isFunction( parent ) ) {
        ( edit( child, parent ).prototype = create( parent.prototype ) )
            .constructor = child;
    } else {
        statics = properties; properties = parent;
    }
    properties && edit( child.prototype, properties );
    statics && edit( child, statics );
    return child;
}
O.inherit = inherit;

// #### [privilege](#privilege)
//
// Generates partially applied functions for use as methods on an `object`.
//
// Functions sourced from `methodStore` accept as arguments the set of
// variables to be closed over, and return the enclosed function that will
// become the `object`’s method.
//
// The `map` argument maps a space-delimited set of method names to an array
// of free variables. These variables are passed as arguments to each of the
// named methods as found within `methodStore`.
//
// This approach promotes reuse of a method’s logic by decoupling the function
// from the native scope of its free variables. A subsequent call to
// `privilege`, then, can be used on behalf of a distinct (though likely
// related) `object` to generate methods that are identical but closed over a
// distinct set of variables.
function privilege ( object, methodStore, map ) {
    each( map, function ( names, args ) {
        each( names.split( rxWhitespace ), function ( i, methodName ) {
            object[ methodName ] = methodStore[ methodName ]
                .apply( undefined, args );
        });
    });
    return object;
}
O.privilege = privilege;

// #### [getPrototypeOf](#get-prototype-of)
//
// Returns an object’s prototype. In environments without native support, this
// may only work if the object’s constructor and its prototype are properly
// associated, e.g., as facilitated by the `create` function.
function getPrototypeOf ( obj ) {
    return obj.__proto__ || obj.constructor.prototype;
}
O.getPrototypeOf = isFunction( Object.getPrototypeOf ) ?
    Object.getPrototypeOf : getPrototypeOf;

// #### [valueFunction](#value-function)
//
// Cyclically references a function’s output as its own `valueOf` property.
function valueFunction ( fn ) { return fn.valueOf = fn; }
O.valueFunction = valueFunction;

// #### [stringFunction](#string-function)
//
// Cyclically references a function’s output as its own `toString` property.
function stringFunction ( fn ) { return fn.toString = fn; }
O.stringFunction = stringFunction;


//
O.env.server && ( module.exports = O );
O.env.client && ( global['O'] = O );

}() );
})()
},{}],8:[function(require,module,exports){
(function(){
  (function() {
  var global;

  global = this;

  module.exports = function() {
    var _ref,
      _this = this;
    this.VERSION = '0.1.0';
    this.options = {
      memoizeProtostates: true,
      useDispatchTables: false
    };
    this.O = (_ref = require('omicron'), this.env = _ref.env, this.NIL = _ref.NIL, _ref);
    this.noConflict = (function() {
      var original;
      original = global.state;
      return function() {
        global.state = original;
        return this;
      };
    })();
    this.bitfield = function(object, names, offset) {
      var index, key, _i, _len;
      if (object == null) {
        object = {};
      }
      if (offset == null) {
        offset = 0;
      }
      if (typeof names === 'string') {
        names = names.split(/\s+/);
      }
      for (index = _i = 0, _len = names.length; _i < _len; index = ++_i) {
        key = names[index];
        object[key] = 1 << index + offset;
      }
      return object;
    };
    this.debug = function() {
      if (_this.env.debug) {
        return console.log.apply(console, arguments);
      }
    };
    this.bind = (function() {
      var StateBoundFunction, bind;
      bind = function(fn) {
        return new StateBoundFunction(fn);
      };
      bind["class"] = StateBoundFunction = (function() {
        StateBoundFunction.prototype.type = 'state-bound-function';

        function StateBoundFunction(fn) {
          this.fn = fn;
        }

        return StateBoundFunction;

      })();
      return bind;
    })();
    this.fix = (function() {
      var StateFixedFunction, fix;
      fix = function(combinator) {
        return new StateFixedFunction(combinator);
      };
      fix["class"] = StateFixedFunction = (function() {
        StateFixedFunction.prototype.type = 'state-fixed-function';

        function StateFixedFunction(fn) {
          this.fn = fn;
        }

        return StateFixedFunction;

      })();
      return fix;
    })();
    this.rxTransitionArrow = /^\s*([\-|=]>)\s*(.*)/;
    this.transitionArrowMethods = {
      '->': 'change',
      '=>': 'changeTo'
    };
    this.STATE_ATTRIBUTE_MODIFIERS = "mutable finite static immutable\ninitial conclusive final\nabstract concrete default\nreflective\nhistory retained shallow versioned\nconcurrent";
    this.STATE_EXPRESSION_CATEGORIES = 'data methods events guards states transitions';
    this.STATE_EVENT_TYPES = 'construct depart exit enter arrive destroy mutate noSuchMethod';
    this.GUARD_ACTIONS = 'admit release';
    this.TRANSITION_PROPERTIES = 'origin source target action conjugate';
    this.TRANSITION_EXPRESSION_CATEGORIES = 'methods events guards';
    this.TRANSITION_EVENT_TYPES = 'construct destroy enter exit start end abort';
    this.STATE_ATTRIBUTES = this.bitfield({
      NORMAL: 0
    }, "INCIPIENT\nATOMIC\nDESTROYED\nVIRTUAL" + ' ' + this.STATE_ATTRIBUTE_MODIFIERS.toUpperCase());
    this.TRAVERSAL_FLAGS = this.bitfield({
      VIA_NONE: 0,
      VIA_ALL: ~0
    }, "VIA_SUB\nVIA_SUPER\nVIA_PROTO");
  };

}).call(this);

})()
},{"omicron":11}]},{},[1])
;