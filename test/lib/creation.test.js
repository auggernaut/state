// Generated by CoffeeScript 1.6.3
(function() {
  var RootState, State, expect, state;

  expect = require('chai').expect;

  state = require('state');

  State = state.State, RootState = state.RootState;

  describe("Creating `State` implementations using the `state` function:", function() {
    describe("Implementing state on an object", function() {
      var object, root;
      object = {};
      state(object, null);
      root = object.state('');
      it("adds a new `state` method to the object", function() {
        return expect(object).to.have.ownProperty('state');
      });
      it("creates a new root state, whose name is the empty string", function() {
        return expect(root).to.be["instanceof"](RootState);
      });
      return it("sets the object’s current state to the root", function() {
        return expect(object.state()).to.equal(root);
      });
    });
    describe("Prototypal state implementations:", function() {
      var Class;
      Class = (function() {
        function Class() {}

        state(Class.prototype, null);

        return Class;

      })();
      describe("Implementing state for a constructor’s prototype", function() {
        var object;
        object = new Class;
        it("exposes a `state` method to an instance", function() {
          return expect(object).to.have.property('state');
        });
        return it("does not create a `state` method for the instance", function() {
          return expect(object).not.to.have.ownProperty('state');
        });
      });
      return describe("Side-effects of calling an inheritor’s `state` method", function() {
        var object, root;
        object = new Class;
        object.state();
        root = object.state('');
        it("add a new own `state` method for the instance", function() {
          expect(object).to.have.ownProperty('state');
          return expect(object.state).to.be.a["function"];
        });
        it("create a new root state for the instance", function() {
          expect(root).to.be["instanceof"](RootState);
          return expect(root.owner).to.equal(object);
        });
        return it("define a *protostate* relation between the two root states", function() {
          return expect(root.protostate).to.equal(Class.prototype.state(''));
        });
      });
    });
    return describe("State tree declarations:", function() {
      describe("Declaring a shallow tree of states for an object", function() {
        var object, root;
        object = {};
        state(object, {
          A: state,
          B: state
        });
        root = object.state('');
        it("creates a root state", function() {
          return expect(root).to.be["instanceof"](RootState);
        });
        it("creates substates as children of the root", function() {
          var a, b;
          expect(a = root.substate('A')).to.be["instanceof"](State);
          expect(a.superstate).to.equal(root);
          expect(b = root.substate('B')).to.be["instanceof"](State);
          return expect(b.superstate).to.equal(root);
        });
        return it("allows direct querying of substates by name", function() {
          var a, b;
          expect(a = object.state('A')).to.equal(root.substate('A'));
          return expect(b = object.state('B')).to.equal(root.substate('B'));
        });
      });
      return describe("Declaring a deep tree of states for an object", function() {
        var object, root;
        object = {};
        state(object, {
          A: state,
          B: state({
            BA: state,
            BB: state({
              BBA: state
            })
          })
        });
        root = object.state('');
        return it("creates chains of deeply nested descendant `State`s", function() {
          var b, bb, bba;
          expect(bba = object.state('B.BB.BBA')).to.be["instanceof"](State);
          expect(bb = bba.superstate).to.equal(object.state('B.BB'));
          expect(b = bb.superstate).to.equal(object.state('B'));
          return expect(b.superstate).to.equal(root);
        });
      });
    });
  });

}).call(this);
