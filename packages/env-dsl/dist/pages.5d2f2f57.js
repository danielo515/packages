// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({11:[function(require,module,exports) {
(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;        // a list of literal | regex class | nonterminal
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;

    Rule.prototype.toString = function(withCursorAt) {
        function stringifySymbolSequence (e) {
            return e.literal ? JSON.stringify(e.literal) :
                   e.type ? '%' + e.type : e.toString();
        }
        var symbolSequence = (typeof withCursorAt === "undefined")
                             ? this.symbols.map(stringifySymbolSequence).join(' ')
                             : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                                 + " ● "
                                 + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
        return this.name + " → " + symbolSequence;
    }


    // a State is a rule at a position from a given starting point in the input stream (reference)
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }

    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    };

    State.prototype.nextState = function(child) {
        var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        state.left = this;
        state.right = child;
        if (state.isComplete) {
            state.data = state.build();
        }
        return state;
    };

    State.prototype.build = function() {
        var children = [];
        var node = this;
        do {
            children.push(node.right.data);
            node = node.left;
        } while (node.left);
        children.reverse();
        return children;
    };

    State.prototype.finish = function() {
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
    };


    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {}; // states indexed by the non-terminal they expect
        this.scannable = []; // list of states that expect a token
        this.completed = {}; // states that are nullable
    }


    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;

        for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
            var state = states[w];

            if (state.isComplete) {
                state.finish();
                if (state.data !== Parser.fail) {
                    // complete
                    var wantedBy = state.wantedBy;
                    for (var i = wantedBy.length; i--; ) { // this line is hot
                        var left = wantedBy[i];
                        this.complete(left, state);
                    }

                    // special-case nullables
                    if (state.reference === this.index) {
                        // make sure future predictors of this rule get completed.
                        var exp = state.rule.name;
                        (this.completed[exp] = this.completed[exp] || []).push(state);
                    }
                }

            } else {
                // queue scannable states
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'string') {
                    this.scannable.push(state);
                    continue;
                }

                // predict
                if (wants[exp]) {
                    wants[exp].push(state);

                    if (completed.hasOwnProperty(exp)) {
                        var nulls = completed[exp];
                        for (var i = 0; i < nulls.length; i++) {
                            var right = nulls[i];
                            this.complete(state, right);
                        }
                    }
                } else {
                    wants[exp] = [state];
                    this.predict(exp);
                }
            }
        }
    }

    Column.prototype.predict = function(exp) {
        var rules = this.grammar.byName[exp] || [];

        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var wantedBy = this.wants[exp];
            var s = new State(r, 0, this.index, wantedBy);
            this.states.push(s);
        }
    }

    Column.prototype.complete = function(left, right) {
        var copy = left.nextState(right);
        this.states.push(copy);
    }


    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = this.byName = {};
        this.rules.forEach(function(rule) {
            if (!byName.hasOwnProperty(rule.name)) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
    }

    // So we can allow passing (rules, start) directly to Parser for backwards compatibility
    Grammar.fromCompiled = function(rules, start) {
        var lexer = rules.Lexer;
        if (rules.ParserStart) {
          start = rules.ParserStart;
          rules = rules.ParserRules;
        }
        var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
        var g = new Grammar(rules, start);
        g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
        return g;
    }


    function StreamLexer() {
      this.reset("");
    }

    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
    }

    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
              this.line += 1;
              this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
    }

    StreamLexer.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak,
      }
    }

    StreamLexer.prototype.formatError = function(token, message) {
        // nb. this gets called after consuming the offending token,
        // so the culprit is index-1
        var buffer = this.buffer;
        if (typeof buffer === 'string') {
            var nextLineBreak = buffer.indexOf('\n', this.index);
            if (nextLineBreak === -1) nextLineBreak = buffer.length;
            var line = buffer.substring(this.lastLineBreak, nextLineBreak)
            var col = this.index - this.lastLineBreak;
            message += " at line " + this.line + " col " + col + ":\n\n";
            message += "  " + line + "\n"
            message += "  " + Array(col).join(" ") + "^"
            return message;
        } else {
            return message + " at index " + (this.index - 1);
        }
    }


    function Parser(rules, start, options) {
        if (rules instanceof Grammar) {
            var grammar = rules;
            var options = start;
        } else {
            var grammar = Grammar.fromCompiled(rules, start);
        }
        this.grammar = grammar;

        // Read options
        this.options = {
            keepHistory: false,
            lexer: grammar.lexer || new StreamLexer,
        };
        for (var key in (options || {})) {
            this.options[key] = options[key];
        }

        // Setup lexer
        this.lexer = this.options.lexer;
        this.lexerState = undefined;

        // Setup a table
        var column = new Column(grammar, 0);
        var table = this.table = [column];

        // I could be expecting anything.
        column.wants[grammar.start] = [];
        column.predict(grammar.start);
        // TODO what if start rule is nullable?
        column.process();
        this.current = 0; // token index
    }

    // create a reserved token for indicating a parse fail
    Parser.fail = {};

    Parser.prototype.feed = function(chunk) {
        var lexer = this.lexer;
        lexer.reset(chunk, this.lexerState);

        var token;
        while (token = lexer.next()) {
            // We add new states to table[current+1]
            var column = this.table[this.current];

            // GC unused states
            if (!this.options.keepHistory) {
                delete this.table[this.current - 1];
            }

            var n = this.current + 1;
            var nextColumn = new Column(this.grammar, n);
            this.table.push(nextColumn);

            // Advance all tokens that expect the symbol
            var literal = token.value;
            var value = lexer.constructor === StreamLexer ? token.value : token;
            var scannable = column.scannable;
            for (var w = scannable.length; w--; ) {
                var state = scannable[w];
                var expect = state.rule.symbols[state.dot];
                // Try to consume the token
                // either regex or literal
                if (expect.test ? expect.test(value) :
                    expect.type ? expect.type === token.type
                                : expect.literal === literal) {
                    // Add it
                    var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                    nextColumn.states.push(next);
                }
            }

            // Next, for each of the rules, we either
            // (a) complete it, and try to see if the reference row expected that
            //     rule
            // (b) predict the next nonterminal it expects by adding that
            //     nonterminal's start state
            // To prevent duplication, we also keep track of rules we have already
            // added

            nextColumn.process();

            // If needed, throw an error:
            if (nextColumn.states.length === 0) {
                // No states at all! This is not good.
                var message = this.lexer.formatError(token, "invalid syntax") + "\n";
                message += "Unexpected " + (token.type ? token.type + " token: " : "");
                message += JSON.stringify(token.value !== undefined ? token.value : token) + "\n";
                var err = new Error(message);
                err.offset = this.current;
                err.token = token;
                throw err;
            }

            // maybe save lexer state
            if (this.options.keepHistory) {
              column.lexerState = lexer.save()
            }

            this.current++;
        }
        if (column) {
          this.lexerState = lexer.save()
        }

        // Incrementally keep track of results
        this.results = this.finish();

        // Allow chaining, for whatever it's worth
        return this;
    };

    Parser.prototype.save = function() {
        var column = this.table[this.current];
        column.lexerState = this.lexerState;
        return column;
    };

    Parser.prototype.restore = function(column) {
        var index = column.index;
        this.current = index;
        this.table[index] = column;
        this.table.splice(index + 1);
        this.lexerState = column.lexerState;

        // Incrementally keep track of results
        this.results = this.finish();
    };

    // nb. deprecated: use save/restore instead!
    Parser.prototype.rewind = function(index) {
        if (!this.options.keepHistory) {
            throw new Error('set option `keepHistory` to enable rewinding')
        }
        // nb. recall column (table) indicies fall between token indicies.
        //        col 0   --   token 0   --   col 1
        this.restore(this.table[index]);
    };

    Parser.prototype.finish = function() {
        // Return the possible parsings
        var considerations = [];
        var start = this.grammar.start;
        var column = this.table[this.table.length - 1]
        column.states.forEach(function (t) {
            if (t.rule.name === start
                    && t.dot === t.rule.symbols.length
                    && t.reference === 0
                    && t.data !== Parser.fail) {
                considerations.push(t);
            }
        });
        return considerations.map(function(c) {return c.data; });
    };

    return {
        Parser: Parser,
        Grammar: Grammar,
        Rule: Rule,
    };

}));

},{}],8:[function(require,module,exports) {
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Generated automatically by nearley, version 2.13.0
// http://github.com/Hardmath123/nearley
(function () {
   function id(x) {
      return x[0];
   }

   var join = function join(sep) {
      return function (arr) {
         return arr.join(sep);
      };
   };
   var map = function map(fn) {
      return function (arr) {
         return arr.map(fn);
      };
   };
   var nth = function nth(pos) {
      return function (arr) {
         return arr[pos];
      };
   };
   var head = function head(arr) {
      return arr[0];
   };
   var pipe = function pipe() {
      for (var _len = arguments.length, fns = Array(_len), _key = 0; _key < _len; _key++) {
         fns[_key] = arguments[_key];
      }

      return function (x) {
         return fns.reduce(function (x, f) {
            return f(x);
         }, x);
      };
   };
   var filter = function filter(fn) {
      return function (arr) {
         return arr.filter(fn);
      };
   };
   var predR = function predR(regex) {
      return function (x) {
         return regex.test(x);
      };
   };
   var notnull = function notnull(x) {
      return x != null;
   };
   var log = function log(x) {
      return console.info(x) || x;
   };
   var toInt = function toInt(x) {
      return x | 0;
   };
   var _true = function _true() {
      return true;
   };
   var _false = function _false() {
      return false;
   };
   var nothing = function nothing(d) {
      return null;
   };
   var compact = filter(notnull);
   var oBind = function oBind(base) {
      return function (ext) {
         return Object.assign({}, base, ext);
      };
   };
   var option = oBind({ type: 'option' });
   var push = function push(arr) {
      return function (x) {
         return arr.push(x) && arr;
      };
   };
   var grammar = {
      Lexer: undefined,
      ParserRules: [{ "name": "PROGRAM$ebnf$1", "symbols": [] }, { "name": "PROGRAM$ebnf$1$subexpression$1", "symbols": ["ln", "LINE"], "postprocess": nth(1) }, { "name": "PROGRAM$ebnf$1", "symbols": ["PROGRAM$ebnf$1", "PROGRAM$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "PROGRAM", "symbols": ["LINE", "PROGRAM$ebnf$1"], "postprocess": function postprocess(_ref) {
            var _ref2 = _slicedToArray(_ref, 2),
                a = _ref2[0],
                b = _ref2[1];

            return [a].concat(_toConsumableArray(b));
         } }, { "name": "LINE$string$1", "symbols": [{ "literal": ":" }, { "literal": ":" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "LINE", "symbols": ["NAME", "_", { "literal": "=" }, "_", "DECLARATION", "_", "LINE$string$1", "_", "TYPE", "__"], "postprocess": function postprocess(_ref3) {
            var _ref4 = _slicedToArray(_ref3, 9),
                _ref4$ = _slicedToArray(_ref4[0], 1),
                name = _ref4$[0],
                body = _ref4[4],
                _ref4$2 = _slicedToArray(_ref4[8], 1),
                coerceTo = _ref4$2[0];

            return { type: 'declaration', name: name, body: body, coerceTo: coerceTo };
         } }, { "name": "NAME", "symbols": ["WORD"] }, { "name": "DECLARATION$ebnf$1", "symbols": [] }, { "name": "DECLARATION$ebnf$1", "symbols": ["DECLARATION$ebnf$1", "DEFAULT"], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "DECLARATION", "symbols": ["WORD", "DECLARATION$ebnf$1"], "postprocess": function postprocess(_ref5) {
            var _ref6 = _slicedToArray(_ref5, 2),
                path = _ref6[0],
                defaults = _ref6[1];

            return { path: path, defaults: defaults };
         } }, { "name": "DEFAULT", "symbols": ["_", { "literal": "|" }, "_", "VALUE"], "postprocess": pipe(nth(3), function (_ref7) {
            var _ref8 = _slicedToArray(_ref7, 1),
                val = _ref8[0];

            return option({ val: val });
         }) }, { "name": "VALUE", "symbols": ["BOOL"] }, { "name": "VALUE", "symbols": ["NUM"] }, { "name": "VALUE", "symbols": ["STR"] }, { "name": "VALUE", "symbols": ["EXPRESSION"] }, { "name": "OPERATOR$string$1", "symbols": [{ "literal": "f" }, { "literal": "i" }, { "literal": "l" }, { "literal": "e" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "OPERATOR", "symbols": ["OPERATOR$string$1"], "postprocess": id }, { "name": "EXPRESSION$subexpression$1", "symbols": ["STR"] }, { "name": "EXPRESSION$subexpression$1", "symbols": ["WORD"] }, { "name": "EXPRESSION", "symbols": ["OPERATOR", "_", "EXPRESSION$subexpression$1"], "postprocess": function postprocess(_ref9) {
            var _ref10 = _slicedToArray(_ref9, 3),
                operator = _ref10[0],
                _ = _ref10[1],
                args = _ref10[2];

            return { type: 'expression', operator: operator, args: args };
         } }, { "name": "BOOL", "symbols": [/[Yy]/, /[eE]/, /[sS]/], "postprocess": _true }, { "name": "BOOL", "symbols": [/[nN]/, /[oO]/], "postprocess": _false }, { "name": "BOOL$string$1", "symbols": [{ "literal": "t" }, { "literal": "r" }, { "literal": "u" }, { "literal": "e" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "BOOL", "symbols": ["BOOL$string$1"], "postprocess": _true }, { "name": "BOOL$string$2", "symbols": [{ "literal": "f" }, { "literal": "a" }, { "literal": "l" }, { "literal": "s" }, { "literal": "e" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "BOOL", "symbols": ["BOOL$string$2"], "postprocess": _false }, { "name": "WORD$ebnf$1", "symbols": [/[a-zA-Z_]/] }, { "name": "WORD$ebnf$1", "symbols": ["WORD$ebnf$1", /[a-zA-Z_]/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "WORD", "symbols": ["WORD$ebnf$1"], "postprocess": pipe(map(join('')), head) }, { "name": "NUM$ebnf$1", "symbols": [/[0-9_]/] }, { "name": "NUM$ebnf$1", "symbols": ["NUM$ebnf$1", /[0-9_]/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "NUM", "symbols": ["NUM$ebnf$1", "UNIT"], "postprocess": pipe(head, filter(predR(/[^_]/)), join(''), toInt) }, { "name": "STR$ebnf$1", "symbols": [] }, { "name": "STR$ebnf$1", "symbols": ["STR$ebnf$1", /[^']/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "STR", "symbols": [{ "literal": "'" }, "STR$ebnf$1", { "literal": "'" }], "postprocess": pipe(nth(1), join('')) }, { "name": "UNIT$ebnf$1", "symbols": [] }, { "name": "UNIT$ebnf$1", "symbols": ["UNIT$ebnf$1", /[a-z]/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "UNIT", "symbols": ["UNIT$ebnf$1"] }, { "name": "TYPE$string$1", "symbols": [{ "literal": "I" }, { "literal": "n" }, { "literal": "t" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "TYPE", "symbols": ["TYPE$string$1"] }, { "name": "TYPE$string$2", "symbols": [{ "literal": "B" }, { "literal": "o" }, { "literal": "o" }, { "literal": "l" }, { "literal": "e" }, { "literal": "a" }, { "literal": "n" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "TYPE", "symbols": ["TYPE$string$2"] }, { "name": "TYPE$string$3", "symbols": [{ "literal": "S" }, { "literal": "t" }, { "literal": "r" }, { "literal": "i" }, { "literal": "n" }, { "literal": "g" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "TYPE", "symbols": ["TYPE$string$3"] }, { "name": "TYPE$string$4", "symbols": [{ "literal": "J" }, { "literal": "S" }, { "literal": "O" }, { "literal": "N" }], "postprocess": function joiner(d) {
            return d.join('');
         } }, { "name": "TYPE", "symbols": ["TYPE$string$4"] }, { "name": "_$ebnf$1", "symbols": [/[ ]/] }, { "name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[ ]/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "_", "symbols": ["_$ebnf$1"], "postprocess": nothing }, { "name": "__$ebnf$1", "symbols": [] }, { "name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {
            return d[0].concat([d[1]]);
         } }, { "name": "__", "symbols": ["__$ebnf$1"], "postprocess": nothing }, { "name": "ln$ebnf$1", "symbols": [{ "literal": "\r" }], "postprocess": id }, { "name": "ln$ebnf$1", "symbols": [], "postprocess": function postprocess(d) {
            return null;
         } }, { "name": "ln", "symbols": ["ln$ebnf$1", { "literal": "\n" }], "postprocess": nothing }],
      ParserStart: "PROGRAM"
   };
   if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
      module.exports = grammar;
   } else {
      window.grammar = grammar;
   }
})();
},{}],16:[function(require,module,exports) {
var define;
/*
        @@@@@@@            @@@@@@@         @@
      @@       @@        @@       @@      @@@
    @@   @@@ @@  @@    @@   @@@ @@  @@   @@@@@@ @@   @@@  @@ @@@      @@@@
   @@  @@   @@@   @@  @@  @@   @@@   @@   @@@   @@   @@@  @@@   @@  @@@   @@
   @@  @@   @@@   @@  @@  @@   @@@   @@   @@@   @@   @@@  @@@   @@  @@@@@@@@
   @@  @@   @@@  @@   @@  @@   @@@  @@    @@@   @@   @@@  @@@   @@  @@@
    @@   @@@ @@@@@     @@   @@@ @@@@@      @@@    @@@ @@  @@@@@@      @@@@@
      @@                 @@                           @@  @@
        @@@@@@@            @@@@@@@               @@@@@    @@
                                                          */
//. # sanctuary-type-identifiers
//.
//. A type is a set of values. Boolean, for example, is the type comprising
//. `true` and `false`. A value may be a member of multiple types (`42` is a
//. member of Number, PositiveNumber, Integer, and many other types).
//.
//. In certain situations it is useful to divide JavaScript values into
//. non-overlapping types. The language provides two constructs for this
//. purpose: the [`typeof`][1] operator and [`Object.prototype.toString`][2].
//. Each has pros and cons, but neither supports user-defined types.
//.
//. This package specifies an [algorithm][3] for deriving a _type identifier_
//. from any JavaScript value, and exports an implementation of the algorithm.
//. Authors of algebraic data types may follow this specification in order to
//. make their data types compatible with the algorithm.
//.
//. ### Algorithm
//.
//. 1.  Take any JavaScript value `x`.
//.
//. 2.  If `x` is `null` or `undefined`, go to step 6.
//.
//. 3.  If `x.constructor` evaluates to `null` or `undefined`, go to step 6.
//.
//. 4.  If `x.constructor.prototype === x`, go to step 6. This check prevents a
//.     prototype object from being considered a member of its associated type.
//.
//. 5.  If `typeof x.constructor['@@type']` evaluates to `'string'`, return
//.     the value of `x.constructor['@@type']`.
//.
//. 6.  Return the [`Object.prototype.toString`][2] representation of `x`
//.     without the leading `'[object '` and trailing `']'`.
//.
//. ### Compatibility
//.
//. For an algebraic data type to be compatible with the [algorithm][3]:
//.
//.   - every member of the type must have a `constructor` property pointing
//.     to an object known as the _type representative_;
//.
//.   - the type representative must have a `@@type` property; and
//.
//.   - the type representative's `@@type` property (the _type identifier_)
//.     must be a string primitive, ideally `'<npm-package-name>/<type-name>'`.
//.
//. For example:
//.
//. ```javascript
//. //  Identity :: a -> Identity a
//. function Identity(x) {
//.   if (!(this instanceof Identity)) return new Identity(x);
//.   this.value = x;
//. }
//.
//. Identity['@@type'] = 'my-package/Identity';
//. ```
//.
//. Note that by using a constructor function the `constructor` property is set
//. implicitly for each value created. Constructor functions are convenient for
//. this reason, but are not required. This definition is also valid:
//.
//. ```javascript
//. //  IdentityTypeRep :: TypeRep Identity
//. var IdentityTypeRep = {
//.   '@@type': 'my-package/Identity'
//. };
//.
//. //  Identity :: a -> Identity a
//. function Identity(x) {
//.   return {constructor: IdentityTypeRep, value: x};
//. }
//. ```
//.
//. ### Usage
//.
//. ```javascript
//. var Identity = require('my-package').Identity;
//. var type = require('sanctuary-type-identifiers');
//.
//. type(null);         // => 'Null'
//. type(true);         // => 'Boolean'
//. type([1, 2, 3]);    // => 'Array'
//. type(Identity);     // => 'Function'
//. type(Identity(0));  // => 'my-package/Identity'
//. ```
//.
//.
//. [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
//. [2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString
//. [3]: #algorithm

(function(f) {

  'use strict';

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd != null) {
    define([], f);
  } else {
    self.sanctuaryTypeIdentifiers = f();
  }

}(function() {

  'use strict';

  //  $$type :: String
  var $$type = '@@type';

  //  type :: Any -> String
  function type(x) {
    return x != null &&
           x.constructor != null &&
           x.constructor.prototype !== x &&
           typeof x.constructor[$$type] === 'string' ?
      x.constructor[$$type] :
      Object.prototype.toString.call(x).slice('[object '.length, -']'.length);
  }

  return type;

}));

},{}],14:[function(require,module,exports) {
var define;
/*
             ############                  #
            ############                  ###
                  #####                  #####
                #####      ####################
              #####       ######################
            #####                     ###########
          #####         ######################
        #####          ####################
      #####                        #####
     ############                 ###
    ############                 */

//. # sanctuary-type-classes
//.
//. The [Fantasy Land Specification][FL] "specifies interoperability of common
//. algebraic structures" by defining a number of type classes. For each type
//. class, it states laws which every member of a type must obey in order for
//. the type to be a member of the type class. In order for the Maybe type to
//. be considered a [Functor][], for example, every `Maybe a` value must have
//. a `fantasy-land/map` method which obeys the identity and composition laws.
//.
//. This project provides:
//.
//.   - [`TypeClass`](#TypeClass), a function for defining type classes;
//.   - one `TypeClass` value for each Fantasy Land type class;
//.   - lawful Fantasy Land methods for JavaScript's built-in types;
//.   - one function for each Fantasy Land method; and
//.   - several functions derived from these functions.
//.
//. ## Type-class hierarchy
//.
/* eslint-disable max-len */
//. <pre>
//.  Setoid   Semigroupoid  Semigroup   Foldable        Functor      Contravariant
//. (equals)    (compose)    (concat)   (reduce)         (map)        (contramap)
//.     |           |           |           \         / | | | | \
//.     |           |           |            \       /  | | | |  \
//.     |           |           |             \     /   | | | |   \
//.     |           |           |              \   /    | | | |    \
//.     |           |           |               \ /     | | | |     \
//.    Ord      Category     Monoid         Traversable | | | |      \
//.   (lte)       (id)       (empty)        (traverse)  / | | \       \
//.                             |                      /  | |  \       \
//.                             |                     /   / \   \       \
//.                             |             Profunctor /   \ Bifunctor \
//.                             |              (promap) /     \ (bimap)   \
//.                             |                      /       \           \
//.                           Group                   /         \           \
//.                          (invert)               Alt        Apply      Extend
//.                                                (alt)        (ap)     (extend)
//.                                                 /           / \           \
//.                                                /           /   \           \
//.                                               /           /     \           \
//.                                              /           /       \           \
//.                                             /           /         \           \
//.                                           Plus    Applicative    Chain      Comonad
//.                                          (zero)       (of)      (chain)    (extract)
//.                                             \         / \         / \
//.                                              \       /   \       /   \
//.                                               \     /     \     /     \
//.                                                \   /       \   /       \
//.                                                 \ /         \ /         \
//.                                             Alternative    Monad     ChainRec
//.                                                                     (chainRec)
//. </pre>
/* eslint-enable max-len */
//.
//. ## API

(function(f) {

  'use strict';

  /* istanbul ignore else */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f(require('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define(['sanctuary-type-identifiers'], f);
  } else {
    self.sanctuaryTypeClasses = f(self.sanctuaryTypeIdentifiers);
  }

}(function(type) {

  'use strict';

  //  concat_ :: Array a -> Array a -> Array a
  function concat_(xs) {
    return function(ys) {
      return xs.concat(ys);
    };
  }

  //  constant :: a -> b -> a
  function constant(x) {
    return function(y) {
      return x;
    };
  }

  //  forEachKey :: (StrMap a, StrMap a ~> String -> Undefined) -> Undefined
  function forEachKey(strMap, f) {
    Object.keys(strMap).forEach(f, strMap);
  }

  //  has :: (String, Object) -> Boolean
  function has(k, o) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  //  identity :: a -> a
  function identity(x) { return x; }

  //  pair :: a -> b -> Pair a b
  function pair(x) {
    return function(y) {
      return [x, y];
    };
  }

  //  sameType :: (a, b) -> Boolean
  function sameType(x, y) {
    return typeof x === typeof y && type(x) === type(y);
  }

  //  type Iteration a = { value :: a, done :: Boolean }

  //  iterationNext :: a -> Iteration a
  function iterationNext(x) { return {value: x, done: false}; }

  //  iterationDone :: a -> Iteration a
  function iterationDone(x) { return {value: x, done: true}; }

  //# TypeClass :: (String, String, Array TypeClass, a -> Boolean) -> TypeClass
  //.
  //. The arguments are:
  //.
  //.   - the name of the type class, prefixed by its npm package name;
  //.   - the documentation URL of the type class;
  //.   - an array of dependencies; and
  //.   - a predicate which accepts any JavaScript value and returns `true`
  //.     if the value satisfies the requirements of the type class; `false`
  //.     otherwise.
  //.
  //. Example:
  //.
  //. ```javascript
  //. //    hasMethod :: String -> a -> Boolean
  //. const hasMethod = name => x => x != null && typeof x[name] == 'function';
  //.
  //. //    Foo :: TypeClass
  //. const Foo = Z.TypeClass(
  //.   'my-package/Foo',
  //.   'http://example.com/my-package#Foo',
  //.   [],
  //.   hasMethod('foo')
  //. );
  //.
  //. //    Bar :: TypeClass
  //. const Bar = Z.TypeClass(
  //.   'my-package/Bar',
  //.   'http://example.com/my-package#Bar',
  //.   [Foo],
  //.   hasMethod('bar')
  //. );
  //. ```
  //.
  //. Types whose values have a `foo` method are members of the Foo type class.
  //. Members of the Foo type class whose values have a `bar` method are also
  //. members of the Bar type class.
  //.
  //. Each `TypeClass` value has a `test` field: a function which accepts
  //. any JavaScript value and returns `true` if the value satisfies the
  //. type class's predicate and the predicates of all the type class's
  //. dependencies; `false` otherwise.
  //.
  //. `TypeClass` values may be used with [sanctuary-def][type-classes]
  //. to define parametrically polymorphic functions which verify their
  //. type-class constraints at run time.
  function TypeClass(name, url, dependencies, test) {
    if (!(this instanceof TypeClass)) {
      return new TypeClass(name, url, dependencies, test);
    }
    this.name = name;
    this.url = url;
    this.test = function(x) {
      return dependencies.every(function(d) { return d.test(x); }) && test(x);
    };
  }

  TypeClass['@@type'] = 'sanctuary-type-classes/TypeClass';

  //  data Location = Constructor | Value

  //  Constructor :: Location
  var Constructor = 'Constructor';

  //  Value :: Location
  var Value = 'Value';

  //  _funcPath :: (Boolean, Array String, a) -> Nullable Function
  function _funcPath(allowInheritedProps, path, _x) {
    var x = _x;
    for (var idx = 0; idx < path.length; idx += 1) {
      var k = path[idx];
      if (x == null || !(allowInheritedProps || has(k, x))) return null;
      x = x[k];
    }
    return typeof x === 'function' ? x : null;
  }

  //  funcPath :: (Array String, a) -> Nullable Function
  function funcPath(path, x) {
    return _funcPath(true, path, x);
  }

  //  implPath :: Array String -> Nullable Function
  function implPath(path) {
    return _funcPath(false, path, implementations);
  }

  //  functionName :: Function -> String
  var functionName = has('name', function f() {}) ?
    function functionName(f) { return f.name; } :
    /* istanbul ignore next */
    function functionName(f) {
      var match = /function (\w*)/.exec(f);
      return match == null ? '' : match[1];
    };

  //  $ :: (String, Array TypeClass, StrMap (Array Location)) -> TypeClass
  function $(_name, dependencies, requirements) {
    function getBoundMethod(_name) {
      var name = 'fantasy-land/' + _name;
      return requirements[_name] === Constructor ?
        function(typeRep) {
          var f = funcPath([name], typeRep);
          return f == null && typeof typeRep === 'function' ?
            implPath([functionName(typeRep), name]) :
            f;
        } :
        function(x) {
          var isPrototype = x != null &&
                            x.constructor != null &&
                            x.constructor.prototype === x;
          var m = null;
          if (!isPrototype) m = funcPath([name], x);
          if (m == null)    m = implPath([type(x), 'prototype', name]);
          return m && m.bind(x);
        };
    }

    var version = '7.1.1';  // updated programmatically
    var keys = Object.keys(requirements);

    var typeClass = TypeClass(
      'sanctuary-type-classes/' + _name,
      'https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + version
        + '#' + _name,
      dependencies,
      function(x) {
        return keys.every(function(_name) {
          var arg = requirements[_name] === Constructor ? x.constructor : x;
          return getBoundMethod(_name)(arg) != null;
        });
      }
    );

    typeClass.methods = keys.reduce(function(methods, _name) {
      methods[_name] = getBoundMethod(_name);
      return methods;
    }, {});

    return typeClass;
  }

  //# Setoid :: TypeClass
  //.
  //. `TypeClass` value for [Setoid][].
  //.
  //. ```javascript
  //. > Setoid.test(null)
  //. true
  //. ```
  var Setoid = $('Setoid', [], {equals: Value});

  //# Ord :: TypeClass
  //.
  //. `TypeClass` value for [Ord][].
  //.
  //. ```javascript
  //. > Ord.test(0)
  //. true
  //.
  //. > Ord.test(Math.sqrt)
  //. false
  //. ```
  var Ord = $('Ord', [Setoid], {lte: Value});

  //# Semigroupoid :: TypeClass
  //.
  //. `TypeClass` value for [Semigroupoid][].
  //.
  //. ```javascript
  //. > Semigroupoid.test(Math.sqrt)
  //. true
  //.
  //. > Semigroupoid.test(0)
  //. false
  //. ```
  var Semigroupoid = $('Semigroupoid', [], {compose: Value});

  //# Category :: TypeClass
  //.
  //. `TypeClass` value for [Category][].
  //.
  //. ```javascript
  //. > Category.test(Math.sqrt)
  //. true
  //.
  //. > Category.test(0)
  //. false
  //. ```
  var Category = $('Category', [Semigroupoid], {id: Constructor});

  //# Semigroup :: TypeClass
  //.
  //. `TypeClass` value for [Semigroup][].
  //.
  //. ```javascript
  //. > Semigroup.test('')
  //. true
  //.
  //. > Semigroup.test(0)
  //. false
  //. ```
  var Semigroup = $('Semigroup', [], {concat: Value});

  //# Monoid :: TypeClass
  //.
  //. `TypeClass` value for [Monoid][].
  //.
  //. ```javascript
  //. > Monoid.test('')
  //. true
  //.
  //. > Monoid.test(0)
  //. false
  //. ```
  var Monoid = $('Monoid', [Semigroup], {empty: Constructor});

  //# Group :: TypeClass
  //.
  //. `TypeClass` value for [Group][].
  //.
  //. ```javascript
  //. > Group.test(Sum(0))
  //. true
  //.
  //. > Group.test('')
  //. false
  //. ```
  var Group = $('Group', [Monoid], {invert: Value});

  //# Functor :: TypeClass
  //.
  //. `TypeClass` value for [Functor][].
  //.
  //. ```javascript
  //. > Functor.test([])
  //. true
  //.
  //. > Functor.test('')
  //. false
  //. ```
  var Functor = $('Functor', [], {map: Value});

  //# Bifunctor :: TypeClass
  //.
  //. `TypeClass` value for [Bifunctor][].
  //.
  //. ```javascript
  //. > Bifunctor.test(Tuple('foo', 64))
  //. true
  //.
  //. > Bifunctor.test([])
  //. false
  //. ```
  var Bifunctor = $('Bifunctor', [Functor], {bimap: Value});

  //# Profunctor :: TypeClass
  //.
  //. `TypeClass` value for [Profunctor][].
  //.
  //. ```javascript
  //. > Profunctor.test(Math.sqrt)
  //. true
  //.
  //. > Profunctor.test([])
  //. false
  //. ```
  var Profunctor = $('Profunctor', [Functor], {promap: Value});

  //# Apply :: TypeClass
  //.
  //. `TypeClass` value for [Apply][].
  //.
  //. ```javascript
  //. > Apply.test([])
  //. true
  //.
  //. > Apply.test('')
  //. false
  //. ```
  var Apply = $('Apply', [Functor], {ap: Value});

  //# Applicative :: TypeClass
  //.
  //. `TypeClass` value for [Applicative][].
  //.
  //. ```javascript
  //. > Applicative.test([])
  //. true
  //.
  //. > Applicative.test({})
  //. false
  //. ```
  var Applicative = $('Applicative', [Apply], {of: Constructor});

  //# Chain :: TypeClass
  //.
  //. `TypeClass` value for [Chain][].
  //.
  //. ```javascript
  //. > Chain.test([])
  //. true
  //.
  //. > Chain.test({})
  //. false
  //. ```
  var Chain = $('Chain', [Apply], {chain: Value});

  //# ChainRec :: TypeClass
  //.
  //. `TypeClass` value for [ChainRec][].
  //.
  //. ```javascript
  //. > ChainRec.test([])
  //. true
  //.
  //. > ChainRec.test({})
  //. false
  //. ```
  var ChainRec = $('ChainRec', [Chain], {chainRec: Constructor});

  //# Monad :: TypeClass
  //.
  //. `TypeClass` value for [Monad][].
  //.
  //. ```javascript
  //. > Monad.test([])
  //. true
  //.
  //. > Monad.test({})
  //. false
  //. ```
  var Monad = $('Monad', [Applicative, Chain], {});

  //# Alt :: TypeClass
  //.
  //. `TypeClass` value for [Alt][].
  //.
  //. ```javascript
  //. > Alt.test({})
  //. true
  //.
  //. > Alt.test('')
  //. false
  //. ```
  var Alt = $('Alt', [Functor], {alt: Value});

  //# Plus :: TypeClass
  //.
  //. `TypeClass` value for [Plus][].
  //.
  //. ```javascript
  //. > Plus.test({})
  //. true
  //.
  //. > Plus.test('')
  //. false
  //. ```
  var Plus = $('Plus', [Alt], {zero: Constructor});

  //# Alternative :: TypeClass
  //.
  //. `TypeClass` value for [Alternative][].
  //.
  //. ```javascript
  //. > Alternative.test([])
  //. true
  //.
  //. > Alternative.test({})
  //. false
  //. ```
  var Alternative = $('Alternative', [Applicative, Plus], {});

  //# Foldable :: TypeClass
  //.
  //. `TypeClass` value for [Foldable][].
  //.
  //. ```javascript
  //. > Foldable.test({})
  //. true
  //.
  //. > Foldable.test('')
  //. false
  //. ```
  var Foldable = $('Foldable', [], {reduce: Value});

  //# Traversable :: TypeClass
  //.
  //. `TypeClass` value for [Traversable][].
  //.
  //. ```javascript
  //. > Traversable.test([])
  //. true
  //.
  //. > Traversable.test('')
  //. false
  //. ```
  var Traversable = $('Traversable', [Functor, Foldable], {traverse: Value});

  //# Extend :: TypeClass
  //.
  //. `TypeClass` value for [Extend][].
  //.
  //. ```javascript
  //. > Extend.test([])
  //. true
  //.
  //. > Extend.test({})
  //. false
  //. ```
  var Extend = $('Extend', [Functor], {extend: Value});

  //# Comonad :: TypeClass
  //.
  //. `TypeClass` value for [Comonad][].
  //.
  //. ```javascript
  //. > Comonad.test(Identity(0))
  //. true
  //.
  //. > Comonad.test([])
  //. false
  //. ```
  var Comonad = $('Comonad', [Extend], {extract: Value});

  //# Contravariant :: TypeClass
  //.
  //. `TypeClass` value for [Contravariant][].
  //.
  //. ```javascript
  //. > Contravariant.test(Math.sqrt)
  //. true
  //.
  //. > Contravariant.test([])
  //. false
  //. ```
  var Contravariant = $('Contravariant', [], {contramap: Value});

  //  Null$prototype$toString :: Null ~> () -> String
  function Null$prototype$toString() {
    return 'null';
  }

  //  Null$prototype$equals :: Null ~> Null -> Boolean
  function Null$prototype$equals(other) {
    return true;
  }

  //  Null$prototype$lte :: Null ~> Null -> Boolean
  function Null$prototype$lte(other) {
    return true;
  }

  //  Undefined$prototype$toString :: Undefined ~> () -> String
  function Undefined$prototype$toString() {
    return 'undefined';
  }

  //  Undefined$prototype$equals :: Undefined ~> Undefined -> Boolean
  function Undefined$prototype$equals(other) {
    return true;
  }

  //  Undefined$prototype$lte :: Undefined ~> Undefined -> Boolean
  function Undefined$prototype$lte(other) {
    return true;
  }

  //  Boolean$prototype$toString :: Boolean ~> () -> String
  function Boolean$prototype$toString() {
    return typeof this === 'object' ?
      'new Boolean(' + toString(this.valueOf()) + ')' :
      this.toString();
  }

  //  Boolean$prototype$equals :: Boolean ~> Boolean -> Boolean
  function Boolean$prototype$equals(other) {
    return typeof this === 'object' ?
      equals(this.valueOf(), other.valueOf()) :
      this === other;
  }

  //  Boolean$prototype$lte :: Boolean ~> Boolean -> Boolean
  function Boolean$prototype$lte(other) {
    return typeof this === 'object' ?
      lte(this.valueOf(), other.valueOf()) :
      this === false || other === true;
  }

  //  Number$prototype$toString :: Number ~> () -> String
  function Number$prototype$toString() {
    return typeof this === 'object' ?
      'new Number(' + toString(this.valueOf()) + ')' :
      1 / this === -Infinity ? '-0' : this.toString(10);
  }

  //  Number$prototype$equals :: Number ~> Number -> Boolean
  function Number$prototype$equals(other) {
    return typeof this === 'object' ?
      equals(this.valueOf(), other.valueOf()) :
      isNaN(this) && isNaN(other) || this === other;
  }

  //  Number$prototype$lte :: Number ~> Number -> Boolean
  function Number$prototype$lte(other) {
    return typeof this === 'object' ?
      lte(this.valueOf(), other.valueOf()) :
      isNaN(this) && isNaN(other) || this <= other;
  }

  //  Date$prototype$toString :: Date ~> () -> String
  function Date$prototype$toString() {
    var x = isNaN(this.valueOf()) ? NaN : this.toISOString();
    return 'new Date(' + toString(x) + ')';
  }

  //  Date$prototype$equals :: Date ~> Date -> Boolean
  function Date$prototype$equals(other) {
    return equals(this.valueOf(), other.valueOf());
  }

  //  Date$prototype$lte :: Date ~> Date -> Boolean
  function Date$prototype$lte(other) {
    return lte(this.valueOf(), other.valueOf());
  }

  //  RegExp$prototype$equals :: RegExp ~> RegExp -> Boolean
  function RegExp$prototype$equals(other) {
    return other.source === this.source &&
           other.global === this.global &&
           other.ignoreCase === this.ignoreCase &&
           other.multiline === this.multiline &&
           other.sticky === this.sticky &&
           other.unicode === this.unicode;
  }

  //  String$empty :: () -> String
  function String$empty() {
    return '';
  }

  //  String$prototype$toString :: String ~> () -> String
  function String$prototype$toString() {
    return typeof this === 'object' ?
      'new String(' + toString(this.valueOf()) + ')' :
      JSON.stringify(this);
  }

  //  String$prototype$equals :: String ~> String -> Boolean
  function String$prototype$equals(other) {
    return typeof this === 'object' ?
      equals(this.valueOf(), other.valueOf()) :
      this === other;
  }

  //  String$prototype$lte :: String ~> String -> Boolean
  function String$prototype$lte(other) {
    return typeof this === 'object' ?
      lte(this.valueOf(), other.valueOf()) :
      this <= other;
  }

  //  String$prototype$concat :: String ~> String -> String
  function String$prototype$concat(other) {
    return this + other;
  }

  //  Array$empty :: () -> Array a
  function Array$empty() {
    return [];
  }

  //  Array$of :: a -> Array a
  function Array$of(x) {
    return [x];
  }

  //  Array$chainRec :: ((a -> c, b -> c, a) -> Array c, a) -> Array b
  function Array$chainRec(f, x) {
    var $todo = [x];
    var $done = [];
    while ($todo.length > 0) {
      var xs = f(iterationNext, iterationDone, $todo.shift());
      var $more = [];
      for (var idx = 0; idx < xs.length; idx += 1) {
        (xs[idx].done ? $done : $more).push(xs[idx].value);
      }
      Array.prototype.unshift.apply($todo, $more);
    }
    return $done;
  }

  //  Array$zero :: () -> Array a
  function Array$zero() {
    return [];
  }

  //  Array$prototype$toString :: Array a ~> () -> String
  function Array$prototype$toString() {
    var reprs = this.map(toString);
    var keys = Object.keys(this).sort();
    for (var idx = 0; idx < keys.length; idx += 1) {
      var k = keys[idx];
      if (!/^\d+$/.test(k)) {
        reprs.push(toString(k) + ': ' + toString(this[k]));
      }
    }
    return '[' + reprs.join(', ') + ']';
  }

  //  Array$prototype$equals :: Array a ~> Array a -> Boolean
  function Array$prototype$equals(other) {
    if (other.length !== this.length) return false;
    for (var idx = 0; idx < this.length; idx += 1) {
      if (!equals(this[idx], other[idx])) return false;
    }
    return true;
  }

  //  Array$prototype$lte :: Array a ~> Array a -> Boolean
  function Array$prototype$lte(other) {
    for (var idx = 0; true; idx += 1) {
      if (idx === this.length) return true;
      if (idx === other.length) return false;
      if (!equals(this[idx], other[idx])) return lte(this[idx], other[idx]);
    }
  }

  //  Array$prototype$concat :: Array a ~> Array a -> Array a
  function Array$prototype$concat(other) {
    return this.concat(other);
  }

  //  Array$prototype$map :: Array a ~> (a -> b) -> Array b
  function Array$prototype$map(f) {
    return this.map(function(x) { return f(x); });
  }

  //  Array$prototype$ap :: Array a ~> Array (a -> b) -> Array b
  function Array$prototype$ap(fs) {
    var result = [];
    for (var idx = 0; idx < fs.length; idx += 1) {
      for (var idx2 = 0; idx2 < this.length; idx2 += 1) {
        result.push(fs[idx](this[idx2]));
      }
    }
    return result;
  }

  //  Array$prototype$chain :: Array a ~> (a -> Array b) -> Array b
  function Array$prototype$chain(f) {
    var result = [];
    this.forEach(function(x) { Array.prototype.push.apply(result, f(x)); });
    return result;
  }

  //  Array$prototype$alt :: Array a ~> Array a -> Array a
  var Array$prototype$alt = Array$prototype$concat;

  //  Array$prototype$reduce :: Array a ~> ((b, a) -> b, b) -> b
  function Array$prototype$reduce(f, initial) {
    return this.reduce(function(acc, x) { return f(acc, x); }, initial);
  }

  //  Array$prototype$traverse :: Applicative f => Array a ~> (TypeRep f, a -> f b) -> f (Array b)
  function Array$prototype$traverse(typeRep, f) {
    var xs = this;
    function go(idx, n) {
      switch (n) {
        case 0: return of(typeRep, []);
        case 2: return lift2(pair, f(xs[idx]), f(xs[idx + 1]));
        default:
          var m = Math.floor(n / 4) * 2;
          return lift2(concat_, go(idx, m), go(idx + m, n - m));
      }
    }
    return this.length % 2 === 1 ?
      lift2(concat_, map(Array$of, f(this[0])), go(1, this.length - 1)) :
      go(0, this.length);
  }

  //  Array$prototype$extend :: Array a ~> (Array a -> b) -> Array b
  function Array$prototype$extend(f) {
    return this.map(function(_, idx, xs) { return f(xs.slice(idx)); });
  }

  //  Arguments$prototype$toString :: Arguments ~> String
  function Arguments$prototype$toString() {
    var args = Array.prototype.map.call(this, toString).join(', ');
    return '(function () { return arguments; }(' + args + '))';
  }

  //  Arguments$prototype$equals :: Arguments ~> Arguments -> Boolean
  function Arguments$prototype$equals(other) {
    return Array$prototype$equals.call(this, other);
  }

  //  Arguments$prototype$lte :: Arguments ~> Arguments -> Boolean
  function Arguments$prototype$lte(other) {
    return Array$prototype$lte.call(this, other);
  }

  //  Error$prototype$toString :: Error ~> () -> String
  function Error$prototype$toString() {
    return 'new ' + this.name + '(' + toString(this.message) + ')';
  }

  //  Error$prototype$equals :: Error ~> Error -> Boolean
  function Error$prototype$equals(other) {
    return equals(this.name, other.name) &&
           equals(this.message, other.message);
  }

  //  Object$empty :: () -> StrMap a
  function Object$empty() {
    return {};
  }

  //  Object$zero :: () -> StrMap a
  function Object$zero() {
    return {};
  }

  //  Object$prototype$toString :: StrMap a ~> () -> String
  function Object$prototype$toString() {
    var reprs = [];
    var keys = Object.keys(this).sort();
    for (var idx = 0; idx < keys.length; idx += 1) {
      var k = keys[idx];
      reprs.push(toString(k) + ': ' + toString(this[k]));
    }
    return '{' + reprs.join(', ') + '}';
  }

  //  Object$prototype$equals :: StrMap a ~> StrMap a -> Boolean
  function Object$prototype$equals(other) {
    var self = this;
    var keys = Object.keys(this).sort();
    return equals(keys, Object.keys(other).sort()) &&
           keys.every(function(k) { return equals(self[k], other[k]); });
  }

  //  Object$prototype$lte :: StrMap a ~> StrMap a -> Boolean
  function Object$prototype$lte(other) {
    var theseKeys = Object.keys(this).sort();
    var otherKeys = Object.keys(other).sort();
    while (true) {
      if (theseKeys.length === 0) return true;
      if (otherKeys.length === 0) return false;
      var k = theseKeys.shift();
      var z = otherKeys.shift();
      if (k < z) return true;
      if (k > z) return false;
      if (!equals(this[k], other[k])) return lte(this[k], other[k]);
    }
  }

  //  Object$prototype$concat :: StrMap a ~> StrMap a -> StrMap a
  function Object$prototype$concat(other) {
    var result = {};
    function assign(k) { result[k] = this[k]; }
    forEachKey(this, assign);
    forEachKey(other, assign);
    return result;
  }

  //  Object$prototype$map :: StrMap a ~> (a -> b) -> StrMap b
  function Object$prototype$map(f) {
    var result = {};
    forEachKey(this, function(k) { result[k] = f(this[k]); });
    return result;
  }

  //  Object$prototype$ap :: StrMap a ~> StrMap (a -> b) -> StrMap b
  function Object$prototype$ap(other) {
    var result = {};
    forEachKey(this, function(k) {
      if (has(k, other)) result[k] = other[k](this[k]);
    });
    return result;
  }

  //  Object$prototype$alt :: StrMap a ~> StrMap a -> StrMap a
  var Object$prototype$alt = Object$prototype$concat;

  //  Object$prototype$reduce :: StrMap a ~> ((b, a) -> b, b) -> b
  function Object$prototype$reduce(f, initial) {
    var self = this;
    function reducer(acc, k) { return f(acc, self[k]); }
    return Object.keys(this).sort().reduce(reducer, initial);
  }

  //  Object$prototype$traverse :: Applicative f => StrMap a ~> (TypeRep f, a -> f b) -> f (StrMap b)
  function Object$prototype$traverse(typeRep, f) {
    var self = this;
    return Object.keys(this).reduce(function(applicative, k) {
      function set(o) {
        return function(v) {
          var singleton = {}; singleton[k] = v;
          return Object$prototype$concat.call(o, singleton);
        };
      }
      return lift2(set, applicative, f(self[k]));
    }, of(typeRep, {}));
  }

  //  Function$id :: () -> a -> a
  function Function$id() {
    return identity;
  }

  //  Function$of :: b -> (a -> b)
  function Function$of(x) {
    return function(_) { return x; };
  }

  //  Function$chainRec :: ((a -> c, b -> c, a) -> (z -> c), a) -> (z -> b)
  function Function$chainRec(f, x) {
    return function(a) {
      var step = iterationNext(x);
      while (!step.done) {
        step = f(iterationNext, iterationDone, step.value)(a);
      }
      return step.value;
    };
  }

  //  Function$prototype$equals :: Function ~> Function -> Boolean
  function Function$prototype$equals(other) {
    return other === this;
  }

  //  Function$prototype$compose :: (a -> b) ~> (b -> c) -> (a -> c)
  function Function$prototype$compose(other) {
    var semigroupoid = this;
    return function(x) { return other(semigroupoid(x)); };
  }

  //  Function$prototype$map :: (a -> b) ~> (b -> c) -> (a -> c)
  function Function$prototype$map(f) {
    var functor = this;
    return function(x) { return f(functor(x)); };
  }

  //  Function$prototype$promap :: (b -> c) ~> (a -> b, c -> d) -> (a -> d)
  function Function$prototype$promap(f, g) {
    var profunctor = this;
    return function(x) { return g(profunctor(f(x))); };
  }

  //  Function$prototype$ap :: (a -> b) ~> (a -> b -> c) -> (a -> c)
  function Function$prototype$ap(f) {
    var apply = this;
    return function(x) { return f(x)(apply(x)); };
  }

  //  Function$prototype$chain :: (a -> b) ~> (b -> a -> c) -> (a -> c)
  function Function$prototype$chain(f) {
    var chain = this;
    return function(x) { return f(chain(x))(x); };
  }

  //  Function$prototype$contramap :: (b -> c) ~> (a -> b) -> (a -> c)
  function Function$prototype$contramap(f) {
    var contravariant = this;
    return function(x) { return contravariant(f(x)); };
  }

  /* eslint-disable key-spacing */
  var implementations = {
    Null: {
      prototype: {
        toString:                   Null$prototype$toString,
        'fantasy-land/equals':      Null$prototype$equals,
        'fantasy-land/lte':         Null$prototype$lte
      }
    },
    Undefined: {
      prototype: {
        toString:                   Undefined$prototype$toString,
        'fantasy-land/equals':      Undefined$prototype$equals,
        'fantasy-land/lte':         Undefined$prototype$lte
      }
    },
    Boolean: {
      prototype: {
        toString:                   Boolean$prototype$toString,
        'fantasy-land/equals':      Boolean$prototype$equals,
        'fantasy-land/lte':         Boolean$prototype$lte
      }
    },
    Number: {
      prototype: {
        toString:                   Number$prototype$toString,
        'fantasy-land/equals':      Number$prototype$equals,
        'fantasy-land/lte':         Number$prototype$lte
      }
    },
    Date: {
      prototype: {
        toString:                   Date$prototype$toString,
        'fantasy-land/equals':      Date$prototype$equals,
        'fantasy-land/lte':         Date$prototype$lte
      }
    },
    RegExp: {
      prototype: {
        'fantasy-land/equals':      RegExp$prototype$equals
      }
    },
    String: {
      'fantasy-land/empty':         String$empty,
      prototype: {
        toString:                   String$prototype$toString,
        'fantasy-land/equals':      String$prototype$equals,
        'fantasy-land/lte':         String$prototype$lte,
        'fantasy-land/concat':      String$prototype$concat
      }
    },
    Array: {
      'fantasy-land/empty':         Array$empty,
      'fantasy-land/of':            Array$of,
      'fantasy-land/chainRec':      Array$chainRec,
      'fantasy-land/zero':          Array$zero,
      prototype: {
        toString:                   Array$prototype$toString,
        'fantasy-land/equals':      Array$prototype$equals,
        'fantasy-land/lte':         Array$prototype$lte,
        'fantasy-land/concat':      Array$prototype$concat,
        'fantasy-land/map':         Array$prototype$map,
        'fantasy-land/ap':          Array$prototype$ap,
        'fantasy-land/chain':       Array$prototype$chain,
        'fantasy-land/alt':         Array$prototype$alt,
        'fantasy-land/reduce':      Array$prototype$reduce,
        'fantasy-land/traverse':    Array$prototype$traverse,
        'fantasy-land/extend':      Array$prototype$extend
      }
    },
    Arguments: {
      prototype: {
        toString:                   Arguments$prototype$toString,
        'fantasy-land/equals':      Arguments$prototype$equals,
        'fantasy-land/lte':         Arguments$prototype$lte
      }
    },
    Error: {
      prototype: {
        toString:                   Error$prototype$toString,
        'fantasy-land/equals':      Error$prototype$equals
      }
    },
    Object: {
      'fantasy-land/empty':         Object$empty,
      'fantasy-land/zero':          Object$zero,
      prototype: {
        toString:                   Object$prototype$toString,
        'fantasy-land/equals':      Object$prototype$equals,
        'fantasy-land/lte':         Object$prototype$lte,
        'fantasy-land/concat':      Object$prototype$concat,
        'fantasy-land/map':         Object$prototype$map,
        'fantasy-land/ap':          Object$prototype$ap,
        'fantasy-land/alt':         Object$prototype$alt,
        'fantasy-land/reduce':      Object$prototype$reduce,
        'fantasy-land/traverse':    Object$prototype$traverse
      }
    },
    Function: {
      'fantasy-land/id':            Function$id,
      'fantasy-land/of':            Function$of,
      'fantasy-land/chainRec':      Function$chainRec,
      prototype: {
        'fantasy-land/equals':      Function$prototype$equals,
        'fantasy-land/compose':     Function$prototype$compose,
        'fantasy-land/map':         Function$prototype$map,
        'fantasy-land/promap':      Function$prototype$promap,
        'fantasy-land/ap':          Function$prototype$ap,
        'fantasy-land/chain':       Function$prototype$chain,
        'fantasy-land/contramap':   Function$prototype$contramap
      }
    }
  };
  /* eslint-enable key-spacing */

  //# toString :: a -> String
  //.
  //. Returns a useful string representation of its argument.
  //.
  //. Dispatches to the argument's `toString` method if appropriate.
  //.
  //. Where practical, `equals(eval(toString(x)), x) = true`.
  //.
  //. `toString` implementations are provided for the following built-in types:
  //. Null, Undefined, Boolean, Number, Date, String, Array, Arguments, Error,
  //. and Object.
  //.
  //. ```javascript
  //. > toString(-0)
  //. '-0'
  //.
  //. > toString(['foo', 'bar', 'baz'])
  //. '["foo", "bar", "baz"]'
  //.
  //. > toString({x: 1, y: 2, z: 3})
  //. '{"x": 1, "y": 2, "z": 3}'
  //.
  //. > toString(Cons(1, Cons(2, Cons(3, Nil))))
  //. 'Cons(1, Cons(2, Cons(3, Nil)))'
  //. ```
  var toString = (function() {
    //  $seen :: Array Any
    var $seen = [];

    function call(method, x) {
      $seen.push(x);
      try { return method.call(x); } finally { $seen.pop(); }
    }

    return function toString(x) {
      if ($seen.indexOf(x) >= 0) return '<Circular>';

      var xType = type(x);
      if (xType === 'Object') {
        var result;
        try { result = call(x.toString, x); } catch (err) {}
        if (result != null && result !== '[object Object]') return result;
      }

      return call(implPath([xType, 'prototype', 'toString']) || x.toString, x);
    };
  }());

  //# equals :: (a, b) -> Boolean
  //.
  //. Returns `true` if its arguments are of the same type and equal according
  //. to the type's [`fantasy-land/equals`][] method; `false` otherwise.
  //.
  //. `fantasy-land/equals` implementations are provided for the following
  //. built-in types: Null, Undefined, Boolean, Number, Date, RegExp, String,
  //. Array, Arguments, Error, Object, and Function.
  //.
  //. The algorithm supports circular data structures. Two arrays are equal
  //. if they have the same index paths and for each path have equal values.
  //. Two arrays which represent `[1, [1, [1, [1, [1, ...]]]]]`, for example,
  //. are equal even if their internal structures differ. Two objects are equal
  //. if they have the same property paths and for each path have equal values.
  //.
  //. ```javascript
  //. > equals(0, -0)
  //. true
  //.
  //. > equals(NaN, NaN)
  //. true
  //.
  //. > equals(Cons('foo', Cons('bar', Nil)), Cons('foo', Cons('bar', Nil)))
  //. true
  //.
  //. > equals(Cons('foo', Cons('bar', Nil)), Cons('bar', Cons('foo', Nil)))
  //. false
  //. ```
  var equals = (function() {
    //  $pairs :: Array (Pair Any Any)
    var $pairs = [];

    return function equals(x, y) {
      if (!sameType(x, y)) return false;

      //  This algorithm for comparing circular data structures was
      //  suggested in <http://stackoverflow.com/a/40622794/312785>.
      if ($pairs.some(function(p) { return p[0] === x && p[1] === y; })) {
        return true;
      }

      $pairs.push([x, y]);
      try {
        return Setoid.test(x) && Setoid.test(y) && Setoid.methods.equals(x)(y);
      } finally {
        $pairs.pop();
      }
    };
  }());

  //# lt :: (a, b) -> Boolean
  //.
  //. Returns `true` if its arguments are of the same type and the first is
  //. less than the second according to the type's [`fantasy-land/lte`][]
  //. method; `false` otherwise.
  //.
  //. This function is derived from [`lte`](#lte).
  //.
  //. See also [`gt`](#gt) and [`gte`](#gte).
  //.
  //. ```javascript
  //. > lt(0, 0)
  //. false
  //.
  //. > lt(0, 1)
  //. true
  //.
  //. > lt(1, 0)
  //. false
  //. ```
  function lt(x, y) {
    return sameType(x, y) && !lte(y, x);
  }

  //# lte :: (a, b) -> Boolean
  //.
  //. Returns `true` if its arguments are of the same type and the first
  //. is less than or equal to the second according to the type's
  //. [`fantasy-land/lte`][] method; `false` otherwise.
  //.
  //. `fantasy-land/lte` implementations are provided for the following
  //. built-in types: Null, Undefined, Boolean, Number, Date, String, Array,
  //. Arguments, and Object.
  //.
  //. The algorithm supports circular data structures in the same manner as
  //. [`equals`](#equals).
  //.
  //. See also [`lt`](#lt), [`gt`](#gt), and [`gte`](#gte).
  //.
  //. ```javascript
  //. > lte(0, 0)
  //. true
  //.
  //. > lte(0, 1)
  //. true
  //.
  //. > lte(1, 0)
  //. false
  //. ```
  var lte = (function() {
    //  $pairs :: Array (Pair Any Any)
    var $pairs = [];

    return function lte(x, y) {
      if (!sameType(x, y)) return false;

      //  This algorithm for comparing circular data structures was
      //  suggested in <http://stackoverflow.com/a/40622794/312785>.
      if ($pairs.some(function(p) { return p[0] === x && p[1] === y; })) {
        return equals(x, y);
      }

      $pairs.push([x, y]);
      try {
        return Ord.test(x) && Ord.test(y) && Ord.methods.lte(x)(y);
      } finally {
        $pairs.pop();
      }
    };
  }());

  //# gt :: (a, b) -> Boolean
  //.
  //. Returns `true` if its arguments are of the same type and the first is
  //. greater than the second according to the type's [`fantasy-land/lte`][]
  //. method; `false` otherwise.
  //.
  //. This function is derived from [`lte`](#lte).
  //.
  //. See also [`lt`](#lt) and [`gte`](#gte).
  //.
  //. ```javascript
  //. > gt(0, 0)
  //. false
  //.
  //. > gt(0, 1)
  //. false
  //.
  //. > gt(1, 0)
  //. true
  //. ```
  function gt(x, y) {
    return lt(y, x);
  }

  //# gte :: (a, b) -> Boolean
  //.
  //. Returns `true` if its arguments are of the same type and the first
  //. is greater than or equal to the second according to the type's
  //. [`fantasy-land/lte`][] method; `false` otherwise.
  //.
  //. This function is derived from [`lte`](#lte).
  //.
  //. See also [`lt`](#lt) and [`gt`](#gt).
  //.
  //. ```javascript
  //. > gte(0, 0)
  //. true
  //.
  //. > gte(0, 1)
  //. false
  //.
  //. > gte(1, 0)
  //. true
  //. ```
  function gte(x, y) {
    return lte(y, x);
  }

  //# min :: Ord a => (a, a) -> a
  //.
  //. Returns the smaller of its two arguments.
  //.
  //. This function is derived from [`lte`](#lte).
  //.
  //. See also [`max`](#max).
  //.
  //. ```javascript
  //. > min(10, 2)
  //. 2
  //.
  //. > min(new Date('1999-12-31'), new Date('2000-01-01'))
  //. new Date('1999-12-31')
  //.
  //. > min('10', '2')
  //. '10'
  //. ```
  function min(x, y) {
    return lte(x, y) ? x : y;
  }

  //# max :: Ord a => (a, a) -> a
  //.
  //. Returns the larger of its two arguments.
  //.
  //. This function is derived from [`lte`](#lte).
  //.
  //. See also [`min`](#min).
  //.
  //. ```javascript
  //. > max(10, 2)
  //. 10
  //.
  //. > max(new Date('1999-12-31'), new Date('2000-01-01'))
  //. new Date('2000-01-01')
  //.
  //. > max('10', '2')
  //. '2'
  //. ```
  function max(x, y) {
    return lte(x, y) ? y : x;
  }

  //# compose :: Semigroupoid c => (c j k, c i j) -> c i k
  //.
  //. Function wrapper for [`fantasy-land/compose`][].
  //.
  //. `fantasy-land/compose` implementations are provided for the following
  //. built-in types: Function.
  //.
  //. ```javascript
  //. > compose(Math.sqrt, x => x + 1)(99)
  //. 10
  //. ```
  function compose(x, y) {
    return Semigroupoid.methods.compose(y)(x);
  }

  //# id :: Category c => TypeRep c -> c
  //.
  //. Function wrapper for [`fantasy-land/id`][].
  //.
  //. `fantasy-land/id` implementations are provided for the following
  //. built-in types: Function.
  //.
  //. ```javascript
  //. > id(Function)('foo')
  //. 'foo'
  //. ```
  function id(typeRep) {
    return Category.methods.id(typeRep)();
  }

  //# concat :: Semigroup a => (a, a) -> a
  //.
  //. Function wrapper for [`fantasy-land/concat`][].
  //.
  //. `fantasy-land/concat` implementations are provided for the following
  //. built-in types: String, Array, and Object.
  //.
  //. ```javascript
  //. > concat('abc', 'def')
  //. 'abcdef'
  //.
  //. > concat([1, 2, 3], [4, 5, 6])
  //. [1, 2, 3, 4, 5, 6]
  //.
  //. > concat({x: 1, y: 2}, {y: 3, z: 4})
  //. {x: 1, y: 3, z: 4}
  //.
  //. > concat(Cons('foo', Cons('bar', Cons('baz', Nil))), Cons('quux', Nil))
  //. Cons('foo', Cons('bar', Cons('baz', Cons('quux', Nil))))
  //. ```
  function concat(x, y) {
    return Semigroup.methods.concat(x)(y);
  }

  //# empty :: Monoid m => TypeRep m -> m
  //.
  //. Function wrapper for [`fantasy-land/empty`][].
  //.
  //. `fantasy-land/empty` implementations are provided for the following
  //. built-in types: String, Array, and Object.
  //.
  //. ```javascript
  //. > empty(String)
  //. ''
  //.
  //. > empty(Array)
  //. []
  //.
  //. > empty(Object)
  //. {}
  //.
  //. > empty(List)
  //. Nil
  //. ```
  function empty(typeRep) {
    return Monoid.methods.empty(typeRep)();
  }

  //# invert :: Group g => g -> g
  //.
  //. Function wrapper for [`fantasy-land/invert`][].
  //.
  //. ```javascript
  //. invert(Sum(5))
  //. Sum(-5)
  //. ```
  function invert(group) {
    return Group.methods.invert(group)();
  }

  //# map :: Functor f => (a -> b, f a) -> f b
  //.
  //. Function wrapper for [`fantasy-land/map`][].
  //.
  //. `fantasy-land/map` implementations are provided for the following
  //. built-in types: Array, Object, and Function.
  //.
  //. ```javascript
  //. > map(Math.sqrt, [1, 4, 9])
  //. [1, 2, 3]
  //.
  //. > map(Math.sqrt, {x: 1, y: 4, z: 9})
  //. {x: 1, y: 2, z: 3}
  //.
  //. > map(Math.sqrt, s => s.length)('Sanctuary')
  //. 3
  //.
  //. > map(Math.sqrt, Tuple('foo', 64))
  //. Tuple('foo', 8)
  //.
  //. > map(Math.sqrt, Nil)
  //. Nil
  //.
  //. > map(Math.sqrt, Cons(1, Cons(4, Cons(9, Nil))))
  //. Cons(1, Cons(2, Cons(3, Nil)))
  //. ```
  function map(f, functor) {
    return Functor.methods.map(functor)(f);
  }

  //# bimap :: Bifunctor f => (a -> b, c -> d, f a c) -> f b d
  //.
  //. Function wrapper for [`fantasy-land/bimap`][].
  //.
  //. ```javascript
  //. > bimap(s => s.toUpperCase(), Math.sqrt, Tuple('foo', 64))
  //. Tuple('FOO', 8)
  //. ```
  function bimap(f, g, bifunctor) {
    return Bifunctor.methods.bimap(bifunctor)(f, g);
  }

  //# promap :: Profunctor p => (a -> b, c -> d, p b c) -> p a d
  //.
  //. Function wrapper for [`fantasy-land/promap`][].
  //.
  //. `fantasy-land/promap` implementations are provided for the following
  //. built-in types: Function.
  //.
  //. ```javascript
  //. > promap(Math.abs, x => x + 1, Math.sqrt)(-100)
  //. 11
  //. ```
  function promap(f, g, profunctor) {
    return Profunctor.methods.promap(profunctor)(f, g);
  }

  //# ap :: Apply f => (f (a -> b), f a) -> f b
  //.
  //. Function wrapper for [`fantasy-land/ap`][].
  //.
  //. `fantasy-land/ap` implementations are provided for the following
  //. built-in types: Array, Object, and Function.
  //.
  //. ```javascript
  //. > ap([Math.sqrt, x => x * x], [1, 4, 9, 16, 25])
  //. [1, 2, 3, 4, 5, 1, 16, 81, 256, 625]
  //.
  //. > ap({a: Math.sqrt, b: x => x * x}, {a: 16, b: 10, c: 1})
  //. {a: 4, b: 100}
  //.
  //. > ap(s => n => s.slice(0, n), s => Math.ceil(s.length / 2))('Haskell')
  //. 'Hask'
  //.
  //. > ap(Identity(Math.sqrt), Identity(64))
  //. Identity(8)
  //.
  //. > ap(Cons(Math.sqrt, Cons(x => x * x, Nil)), Cons(16, Cons(100, Nil)))
  //. Cons(4, Cons(10, Cons(256, Cons(10000, Nil))))
  //. ```
  function ap(applyF, applyX) {
    return Apply.methods.ap(applyX)(applyF);
  }

  //# lift2 :: Apply f => (a -> b -> c, f a, f b) -> f c
  //.
  //. Lifts `a -> b -> c` to `Apply f => f a -> f b -> f c` and returns the
  //. result of applying this to the given arguments.
  //.
  //. This function is derived from [`map`](#map) and [`ap`](#ap).
  //.
  //. See also [`lift3`](#lift3).
  //.
  //. ```javascript
  //. > lift2(x => y => Math.pow(x, y), [10], [1, 2, 3])
  //. [10, 100, 1000]
  //.
  //. > lift2(x => y => Math.pow(x, y), Identity(10), Identity(3))
  //. Identity(1000)
  //. ```
  function lift2(f, x, y) {
    return ap(map(f, x), y);
  }

  //# lift3 :: Apply f => (a -> b -> c -> d, f a, f b, f c) -> f d
  //.
  //. Lifts `a -> b -> c -> d` to `Apply f => f a -> f b -> f c -> f d` and
  //. returns the result of applying this to the given arguments.
  //.
  //. This function is derived from [`map`](#map) and [`ap`](#ap).
  //.
  //. See also [`lift2`](#lift2).
  //.
  //. ```javascript
  //. > lift3(x => y => z => x + z + y, ['<'], ['>'], ['foo', 'bar', 'baz'])
  //. ['<foo>', '<bar>', '<baz>']
  //.
  //. > lift3(x => y => z => x + z + y, Identity('<'), Identity('>'), Identity('baz'))
  //. Identity('<baz>')
  //. ```
  function lift3(f, x, y, z) {
    return ap(ap(map(f, x), y), z);
  }

  //# apFirst :: Apply f => (f a, f b) -> f a
  //.
  //. Combines two effectful actions, keeping only the result of the first.
  //. Equivalent to Haskell's `(<*)` function.
  //.
  //. This function is derived from [`lift2`](#lift2).
  //.
  //. See also [`apSecond`](#apSecond).
  //.
  //. ```javascript
  //. > apFirst([1, 2], [3, 4])
  //. [1, 1, 2, 2]
  //.
  //. > apFirst(Identity(1), Identity(2))
  //. Identity(1)
  //. ```
  function apFirst(x, y) {
    return lift2(constant, x, y);
  }

  //# apSecond :: Apply f => (f a, f b) -> f b
  //.
  //. Combines two effectful actions, keeping only the result of the second.
  //. Equivalent to Haskell's `(*>)` function.
  //.
  //. This function is derived from [`lift2`](#lift2).
  //.
  //. See also [`apFirst`](#apFirst).
  //.
  //. ```javascript
  //. > apSecond([1, 2], [3, 4])
  //. [3, 4, 3, 4]
  //.
  //. > apSecond(Identity(1), Identity(2))
  //. Identity(2)
  //. ```
  function apSecond(x, y) {
    return lift2(constant(identity), x, y);
  }

  //# of :: Applicative f => (TypeRep f, a) -> f a
  //.
  //. Function wrapper for [`fantasy-land/of`][].
  //.
  //. `fantasy-land/of` implementations are provided for the following
  //. built-in types: Array and Function.
  //.
  //. ```javascript
  //. > of(Array, 42)
  //. [42]
  //.
  //. > of(Function, 42)(null)
  //. 42
  //.
  //. > of(List, 42)
  //. Cons(42, Nil)
  //. ```
  function of(typeRep, x) {
    return Applicative.methods.of(typeRep)(x);
  }

  //# append :: (Applicative f, Semigroup (f a)) => (a, f a) -> f a
  //.
  //. Returns the result of appending the first argument to the second.
  //.
  //. This function is derived from [`concat`](#concat) and [`of`](#of).
  //.
  //. See also [`prepend`](#prepend).
  //.
  //. ```javascript
  //. > append(3, [1, 2])
  //. [1, 2, 3]
  //.
  //. > append(3, Cons(1, Cons(2, Nil)))
  //. Cons(1, Cons(2, Cons(3, Nil)))
  //. ```
  function append(x, xs) {
    return concat(xs, of(xs.constructor, x));
  }

  //# prepend :: (Applicative f, Semigroup (f a)) => (a, f a) -> f a
  //.
  //. Returns the result of prepending the first argument to the second.
  //.
  //. This function is derived from [`concat`](#concat) and [`of`](#of).
  //.
  //. See also [`append`](#append).
  //.
  //. ```javascript
  //. > prepend(1, [2, 3])
  //. [1, 2, 3]
  //.
  //. > prepend(1, Cons(2, Cons(3, Nil)))
  //. Cons(1, Cons(2, Cons(3, Nil)))
  //. ```
  function prepend(x, xs) {
    return concat(of(xs.constructor, x), xs);
  }

  //# chain :: Chain m => (a -> m b, m a) -> m b
  //.
  //. Function wrapper for [`fantasy-land/chain`][].
  //.
  //. `fantasy-land/chain` implementations are provided for the following
  //. built-in types: Array and Function.
  //.
  //. ```javascript
  //. > chain(x => [x, x], [1, 2, 3])
  //. [1, 1, 2, 2, 3, 3]
  //.
  //. > chain(x => x % 2 == 1 ? of(List, x) : Nil, Cons(1, Cons(2, Cons(3, Nil))))
  //. Cons(1, Cons(3, Nil))
  //.
  //. > chain(n => s => s.slice(0, n), s => Math.ceil(s.length / 2))('Haskell')
  //. 'Hask'
  //. ```
  function chain(f, chain_) {
    return Chain.methods.chain(chain_)(f);
  }

  //# join :: Chain m => m (m a) -> m a
  //.
  //. Removes one level of nesting from a nested monadic structure.
  //.
  //. This function is derived from [`chain`](#chain).
  //.
  //. ```javascript
  //. > join([[1], [2], [3]])
  //. [1, 2, 3]
  //.
  //. > join([[[1, 2, 3]]])
  //. [[1, 2, 3]]
  //.
  //. > join(Identity(Identity(1)))
  //. Identity(1)
  //. ```
  function join(chain_) {
    return chain(identity, chain_);
  }

  //# chainRec :: ChainRec m => (TypeRep m, (a -> c, b -> c, a) -> m c, a) -> m b
  //.
  //. Function wrapper for [`fantasy-land/chainRec`][].
  //.
  //. `fantasy-land/chainRec` implementations are provided for the following
  //. built-in types: Array.
  //.
  //. ```javascript
  //. > chainRec(
  //. .   Array,
  //. .   (next, done, s) => s.length == 2 ? [s + '!', s + '?'].map(done)
  //. .                                    : [s + 'o', s + 'n'].map(next),
  //. .   ''
  //. . )
  //. ['oo!', 'oo?', 'on!', 'on?', 'no!', 'no?', 'nn!', 'nn?']
  //. ```
  function chainRec(typeRep, f, x) {
    return ChainRec.methods.chainRec(typeRep)(f, x);
  }

  //# filter :: (Applicative f, Foldable f, Monoid (f a)) => (a -> Boolean, f a) -> f a
  //.
  //. Filters its second argument in accordance with the given predicate.
  //.
  //. This function is derived from [`concat`](#concat), [`empty`](#empty),
  //. [`of`](#of), and [`reduce`](#reduce).
  //.
  //. See also [`filterM`](#filterM).
  //.
  //. ```javascript
  //. > filter(x => x % 2 == 1, [1, 2, 3])
  //. [1, 3]
  //.
  //. > filter(x => x % 2 == 1, Cons(1, Cons(2, Cons(3, Nil))))
  //. Cons(1, Cons(3, Nil))
  //. ```
  function filter(pred, m) {
    //  Fast path for arrays.
    if (Array.isArray(m)) return m.filter(function(x) { return pred(x); });
    var M = m.constructor;
    return reduce(function(m, x) { return pred(x) ? concat(m, of(M, x)) : m; },
                  empty(M),
                  m);
  }

  //# filterM :: (Alternative m, Monad m) => (a -> Boolean, m a) -> m a
  //.
  //. Filters its second argument in accordance with the given predicate.
  //.
  //. This function is derived from [`of`](#of), [`chain`](#chain), and
  //. [`zero`](#zero).
  //.
  //. See also [`filter`](#filter).
  //.
  //. ```javascript
  //. > filterM(x => x % 2 == 1, [1, 2, 3])
  //. [1, 3]
  //.
  //. > filterM(x => x % 2 == 1, Cons(1, Cons(2, Cons(3, Nil))))
  //. Cons(1, Cons(3, Nil))
  //.
  //. > filterM(x => x % 2 == 1, Nothing)
  //. Nothing
  //.
  //. > filterM(x => x % 2 == 1, Just(0))
  //. Nothing
  //.
  //. > filterM(x => x % 2 == 1, Just(1))
  //. Just(1)
  //. ```
  function filterM(pred, m) {
    var M = m.constructor;
    var z = zero(M);
    return chain(function(x) { return pred(x) ? of(M, x) : z; }, m);
  }

  //# alt :: Alt f => (f a, f a) -> f a
  //.
  //. Function wrapper for [`fantasy-land/alt`][].
  //.
  //. `fantasy-land/alt` implementations are provided for the following
  //. built-in types: Array and Object.
  //.
  //. ```javascript
  //. > alt([1, 2, 3], [4, 5, 6])
  //. [1, 2, 3, 4, 5, 6]
  //.
  //. > alt(Nothing, Nothing)
  //. Nothing
  //.
  //. > alt(Nothing, Just(1))
  //. Just(1)
  //.
  //. > alt(Just(2), Just(3))
  //. Just(2)
  //. ```
  function alt(x, y) {
    return Alt.methods.alt(x)(y);
  }

  //# zero :: Plus f => TypeRep f -> f a
  //.
  //. Function wrapper for [`fantasy-land/zero`][].
  //.
  //. `fantasy-land/zero` implementations are provided for the following
  //. built-in types: Array and Object.
  //.
  //. ```javascript
  //. > zero(Array)
  //. []
  //.
  //. > zero(Object)
  //. {}
  //.
  //. > zero(Maybe)
  //. Nothing
  //. ```
  function zero(typeRep) {
    return Plus.methods.zero(typeRep)();
  }

  //# reduce :: Foldable f => ((b, a) -> b, b, f a) -> b
  //.
  //. Function wrapper for [`fantasy-land/reduce`][].
  //.
  //. `fantasy-land/reduce` implementations are provided for the following
  //. built-in types: Array and Object.
  //.
  //. ```javascript
  //. > reduce((xs, x) => [x].concat(xs), [], [1, 2, 3])
  //. [3, 2, 1]
  //.
  //. > reduce(concat, '', Cons('foo', Cons('bar', Cons('baz', Nil))))
  //. 'foobarbaz'
  //. ```
  function reduce(f, x, foldable) {
    return Foldable.methods.reduce(foldable)(f, x);
  }

  //# size :: Foldable f => f a -> Integer
  //.
  //. Returns the number of elements of the given structure.
  //.
  //. This function is derived from [`reduce`](#reduce).
  //.
  //. ```javascript
  //. > size([])
  //. 0
  //.
  //. > size(['foo', 'bar', 'baz'])
  //. 3
  //.
  //. > size(Nil)
  //. 0
  //.
  //. > size(Cons('foo', Cons('bar', Cons('baz', Nil))))
  //. 3
  //. ```
  function size(foldable) {
    //  Fast path for arrays.
    if (Array.isArray(foldable)) return foldable.length;
    return reduce(function(n, _) { return n + 1; }, 0, foldable);
  }

  //# elem :: (Setoid a, Foldable f) => (a, f a) -> Boolean
  //.
  //. Takes a value and a structure and returns `true` if the
  //. value is an element of the structure; `false` otherwise.
  //.
  //. This function is derived from [`equals`](#equals) and
  //. [`reduce`](#reduce).
  //.
  //. ```javascript
  //. > elem('c', ['a', 'b', 'c'])
  //. true
  //.
  //. > elem('x', ['a', 'b', 'c'])
  //. false
  //.
  //. > elem(3, {x: 1, y: 2, z: 3})
  //. true
  //.
  //. > elem(8, {x: 1, y: 2, z: 3})
  //. false
  //.
  //. > elem(0, Just(0))
  //. true
  //.
  //. > elem(0, Just(1))
  //. false
  //.
  //. > elem(0, Nothing)
  //. false
  //. ```
  function elem(x, foldable) {
    return reduce(function(b, y) { return b || equals(x, y); },
                  false,
                  foldable);
  }

  //# reverse :: (Applicative f, Foldable f, Monoid (f a)) => f a -> f a
  //.
  //. Reverses the elements of the given structure.
  //.
  //. This function is derived from [`concat`](#concat), [`empty`](#empty),
  //. [`of`](#of), and [`reduce`](#reduce).
  //.
  //. ```javascript
  //. > reverse([1, 2, 3])
  //. [3, 2, 1]
  //.
  //. > reverse(Cons(1, Cons(2, Cons(3, Nil))))
  //. Cons(3, Cons(2, Cons(1, Nil)))
  //. ```
  function reverse(foldable) {
    //  Fast path for arrays.
    if (Array.isArray(foldable)) return foldable.slice().reverse();
    var F = foldable.constructor;
    return reduce(function(xs, x) { return concat(of(F, x), xs); },
                  empty(F),
                  foldable);
  }

  //# sort :: (Ord a, Applicative f, Foldable f, Monoid (f a)) => f a -> f a
  //.
  //. Performs a [stable sort][] of the elements of the given structure,
  //. using [`lte`](#lte) for comparisons.
  //.
  //. This function is derived from [`lte`](#lte), [`concat`](#concat),
  //. [`empty`](#empty), [`of`](#of), and [`reduce`](#reduce).
  //.
  //. See also [`sortBy`](#sortBy).
  //.
  //. ```javascript
  //. > sort(['foo', 'bar', 'baz'])
  //. ['bar', 'baz', 'foo']
  //.
  //. > sort([Just(2), Nothing, Just(1)])
  //. [Nothing, Just(1), Just(2)]
  //.
  //. > sort(Cons('foo', Cons('bar', Cons('baz', Nil))))
  //. Cons('bar', Cons('baz', Cons('foo', Nil)))
  //. ```
  function sort(foldable) {
    return sortBy(identity, foldable);
  }

  //# sortBy :: (Ord b, Applicative f, Foldable f, Monoid (f a)) => (a -> b, f a) -> f a
  //.
  //. Performs a [stable sort][] of the elements of the given structure,
  //. using [`lte`](#lte) to compare the values produced by applying the
  //. given function to each element of the structure.
  //.
  //. This function is derived from [`lte`](#lte), [`concat`](#concat),
  //. [`empty`](#empty), [`of`](#of), and [`reduce`](#reduce).
  //.
  //. See also [`sort`](#sort).
  //.
  //. ```javascript
  //. > sortBy(s => s.length, ['red', 'green', 'blue'])
  //. ['red', 'blue', 'green']
  //.
  //. > sortBy(s => s.length, ['black', 'white'])
  //. ['black', 'white']
  //.
  //. > sortBy(s => s.length, ['white', 'black'])
  //. ['white', 'black']
  //.
  //. > sortBy(s => s.length, Cons('red', Cons('green', Cons('blue', Nil))))
  //. Cons('red', Cons('blue', Cons('green', Nil)))
  //. ```
  function sortBy(f, foldable) {
    var rs = reduce(function(xs, x) {
      var fx = f(x);
      var lower = 0;
      var upper = xs.length;
      while (lower < upper) {
        var idx = Math.floor((lower + upper) / 2);
        if (lte(xs[idx].fx, fx)) lower = idx + 1; else upper = idx;
      }
      xs.splice(lower, 0, {x: x, fx: fx});
      return xs;
    }, [], foldable);

    var F = foldable.constructor;
    var result = empty(F);
    for (var idx = 0; idx < rs.length; idx += 1) {
      result = concat(result, of(F, rs[idx].x));
    }
    return result;
  }

  //# takeWhile :: (Applicative f, Foldable f, Monoid (f a)) => (a -> Boolean, f a) -> f a
  //.
  //. Discards the first inner value which does not satisfy the predicate, and
  //. all subsequent inner values.
  //.
  //. This function is derived from [`concat`](#concat), [`empty`](#empty),
  //. [`of`](#of), and [`reduce`](#reduce).
  //.
  //. See also [`dropWhile`](#dropWhile).
  //.
  //. ```javascript
  //. > takeWhile(s => /x/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. ['xy', 'xz', 'yx']
  //.
  //. > takeWhile(s => /y/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. ['xy']
  //.
  //. > takeWhile(s => /z/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. []
  //. ```
  function takeWhile(pred, foldable) {
    var take = true;
    return filter(function(x) { return take = take && pred(x); }, foldable);
  }

  //# dropWhile :: (Applicative f, Foldable f, Monoid (f a)) => (a -> Boolean, f a) -> f a
  //.
  //. Retains the first inner value which does not satisfy the predicate, and
  //. all subsequent inner values.
  //.
  //. This function is derived from [`concat`](#concat), [`empty`](#empty),
  //. [`of`](#of), and [`reduce`](#reduce).
  //.
  //. See also [`takeWhile`](#takeWhile).
  //.
  //. ```javascript
  //. > dropWhile(s => /x/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. ['yz', 'zx', 'zy']
  //.
  //. > dropWhile(s => /y/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. ['xz', 'yx', 'yz', 'zx', 'zy']
  //.
  //. > dropWhile(s => /z/.test(s), ['xy', 'xz', 'yx', 'yz', 'zx', 'zy'])
  //. ['xy', 'xz', 'yx', 'yz', 'zx', 'zy']
  //. ```
  function dropWhile(pred, foldable) {
    var take = false;
    return filter(function(x) { return take = take || !pred(x); }, foldable);
  }

  //# traverse :: (Applicative f, Traversable t) => (TypeRep f, a -> f b, t a) -> f (t b)
  //.
  //. Function wrapper for [`fantasy-land/traverse`][].
  //.
  //. `fantasy-land/traverse` implementations are provided for the following
  //. built-in types: Array and Object.
  //.
  //. See also [`sequence`](#sequence).
  //.
  //. ```javascript
  //. > traverse(Array, x => x, [[1, 2, 3], [4, 5]])
  //. [[1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]]
  //.
  //. > traverse(Identity, x => Identity(x + 1), [1, 2, 3])
  //. Identity([2, 3, 4])
  //. ```
  function traverse(typeRep, f, traversable) {
    return Traversable.methods.traverse(traversable)(typeRep, f);
  }

  //# sequence :: (Applicative f, Traversable t) => (TypeRep f, t (f a)) -> f (t a)
  //.
  //. Inverts the given `t (f a)` to produce an `f (t a)`.
  //.
  //. This function is derived from [`traverse`](#traverse).
  //.
  //. ```javascript
  //. > sequence(Array, Identity([1, 2, 3]))
  //. [Identity(1), Identity(2), Identity(3)]
  //.
  //. > sequence(Identity, [Identity(1), Identity(2), Identity(3)])
  //. Identity([1, 2, 3])
  //. ```
  function sequence(typeRep, traversable) {
    return traverse(typeRep, identity, traversable);
  }

  //# extend :: Extend w => (w a -> b, w a) -> w b
  //.
  //. Function wrapper for [`fantasy-land/extend`][].
  //.
  //. `fantasy-land/extend` implementations are provided for the following
  //. built-in types: Array.
  //.
  //. ```javascript
  //. > extend(ss => ss.join(''), ['x', 'y', 'z'])
  //. ['xyz', 'yz', 'z']
  //. ```
  function extend(f, extend_) {
    return Extend.methods.extend(extend_)(f);
  }

  //# extract :: Comonad w => w a -> a
  //.
  //. Function wrapper for [`fantasy-land/extract`][].
  //.
  //. ```javascript
  //. > extract(Identity(42))
  //. 42
  //. ```
  function extract(comonad) {
    return Comonad.methods.extract(comonad)();
  }

  //# contramap :: Contravariant f => (b -> a, f a) -> f b
  //.
  //. Function wrapper for [`fantasy-land/contramap`][].
  //.
  //. `fantasy-land/contramap` implementations are provided for the following
  //. built-in types: Function.
  //.
  //. ```javascript
  //. > contramap(s => s.length, Math.sqrt)('Sanctuary')
  //. 3
  //. ```
  function contramap(f, contravariant) {
    return Contravariant.methods.contramap(contravariant)(f);
  }

  return {
    TypeClass: TypeClass,
    Setoid: Setoid,
    Ord: Ord,
    Semigroupoid: Semigroupoid,
    Category: Category,
    Semigroup: Semigroup,
    Monoid: Monoid,
    Group: Group,
    Functor: Functor,
    Bifunctor: Bifunctor,
    Profunctor: Profunctor,
    Apply: Apply,
    Applicative: Applicative,
    Chain: Chain,
    ChainRec: ChainRec,
    Monad: Monad,
    Alt: Alt,
    Plus: Plus,
    Alternative: Alternative,
    Foldable: Foldable,
    Traversable: Traversable,
    Extend: Extend,
    Comonad: Comonad,
    Contravariant: Contravariant,
    toString: toString,
    equals: equals,
    lt: lt,
    lte: lte,
    gt: gt,
    gte: gte,
    min: min,
    max: max,
    compose: compose,
    id: id,
    concat: concat,
    empty: empty,
    invert: invert,
    map: map,
    bimap: bimap,
    promap: promap,
    ap: ap,
    lift2: lift2,
    lift3: lift3,
    apFirst: apFirst,
    apSecond: apSecond,
    of: of,
    append: append,
    prepend: prepend,
    chain: chain,
    join: join,
    chainRec: chainRec,
    filter: filter,
    filterM: filterM,
    alt: alt,
    zero: zero,
    reduce: reduce,
    size: size,
    elem: elem,
    reverse: reverse,
    sort: sort,
    sortBy: sortBy,
    takeWhile: takeWhile,
    dropWhile: dropWhile,
    traverse: traverse,
    sequence: sequence,
    extend: extend,
    extract: extract,
    contramap: contramap
  };

}));

//. [Alt]:                      https://github.com/fantasyland/fantasy-land#alt
//. [Alternative]:              https://github.com/fantasyland/fantasy-land#alternative
//. [Applicative]:              https://github.com/fantasyland/fantasy-land#applicative
//. [Apply]:                    https://github.com/fantasyland/fantasy-land#apply
//. [Bifunctor]:                https://github.com/fantasyland/fantasy-land#bifunctor
//. [Category]:                 https://github.com/fantasyland/fantasy-land#category
//. [Chain]:                    https://github.com/fantasyland/fantasy-land#chain
//. [ChainRec]:                 https://github.com/fantasyland/fantasy-land#chainrec
//. [Comonad]:                  https://github.com/fantasyland/fantasy-land#comonad
//. [Contravariant]:            https://github.com/fantasyland/fantasy-land#contravariant
//. [Extend]:                   https://github.com/fantasyland/fantasy-land#extend
//. [FL]:                       https://github.com/fantasyland/fantasy-land
//. [Foldable]:                 https://github.com/fantasyland/fantasy-land#foldable
//. [Functor]:                  https://github.com/fantasyland/fantasy-land#functor
//. [Group]:                    https://github.com/fantasyland/fantasy-land#group
//. [Monad]:                    https://github.com/fantasyland/fantasy-land#monad
//. [Monoid]:                   https://github.com/fantasyland/fantasy-land#monoid
//. [Ord]:                      https://github.com/fantasyland/fantasy-land#ord
//. [Plus]:                     https://github.com/fantasyland/fantasy-land#plus
//. [Profunctor]:               https://github.com/fantasyland/fantasy-land#profunctor
//. [Semigroup]:                https://github.com/fantasyland/fantasy-land#semigroup
//. [Semigroupoid]:             https://github.com/fantasyland/fantasy-land#semigroupoid
//. [Setoid]:                   https://github.com/fantasyland/fantasy-land#setoid
//. [Traversable]:              https://github.com/fantasyland/fantasy-land#traversable
//. [`fantasy-land/alt`]:       https://github.com/fantasyland/fantasy-land#alt-method
//. [`fantasy-land/ap`]:        https://github.com/fantasyland/fantasy-land#ap-method
//. [`fantasy-land/bimap`]:     https://github.com/fantasyland/fantasy-land#bimap-method
//. [`fantasy-land/chain`]:     https://github.com/fantasyland/fantasy-land#chain-method
//. [`fantasy-land/chainRec`]:  https://github.com/fantasyland/fantasy-land#chainrec-method
//. [`fantasy-land/compose`]:   https://github.com/fantasyland/fantasy-land#compose-method
//. [`fantasy-land/concat`]:    https://github.com/fantasyland/fantasy-land#concat-method
//. [`fantasy-land/contramap`]: https://github.com/fantasyland/fantasy-land#contramap-method
//. [`fantasy-land/empty`]:     https://github.com/fantasyland/fantasy-land#empty-method
//. [`fantasy-land/equals`]:    https://github.com/fantasyland/fantasy-land#equals-method
//. [`fantasy-land/extend`]:    https://github.com/fantasyland/fantasy-land#extend-method
//. [`fantasy-land/extract`]:   https://github.com/fantasyland/fantasy-land#extract-method
//. [`fantasy-land/id`]:        https://github.com/fantasyland/fantasy-land#id-method
//. [`fantasy-land/invert`]:    https://github.com/fantasyland/fantasy-land#invert-method
//. [`fantasy-land/lte`]:       https://github.com/fantasyland/fantasy-land#lte-method
//. [`fantasy-land/map`]:       https://github.com/fantasyland/fantasy-land#map-method
//. [`fantasy-land/of`]:        https://github.com/fantasyland/fantasy-land#of-method
//. [`fantasy-land/promap`]:    https://github.com/fantasyland/fantasy-land#promap-method
//. [`fantasy-land/reduce`]:    https://github.com/fantasyland/fantasy-land#reduce-method
//. [`fantasy-land/traverse`]:  https://github.com/fantasyland/fantasy-land#traverse-method
//. [`fantasy-land/zero`]:      https://github.com/fantasyland/fantasy-land#zero-method
//. [stable sort]:              https://en.wikipedia.org/wiki/Sorting_algorithm#Stability
//. [type-classes]:             https://github.com/sanctuary-js/sanctuary-def#type-classes

},{"sanctuary-type-identifiers":16}],15:[function(require,module,exports) {
var define;
/*
        @@@@@@@            @@@@@@@         @@
      @@       @@        @@       @@      @@@
    @@   @@@ @@  @@    @@   @@@ @@  @@   @@@@@@ @@   @@@  @@ @@@      @@@@
   @@  @@   @@@   @@  @@  @@   @@@   @@   @@@   @@   @@@  @@@   @@  @@@   @@
   @@  @@   @@@   @@  @@  @@   @@@   @@   @@@   @@   @@@  @@@   @@  @@@@@@@@
   @@  @@   @@@  @@   @@  @@   @@@  @@    @@@   @@   @@@  @@@   @@  @@@
    @@   @@@ @@@@@     @@   @@@ @@@@@      @@@    @@@ @@  @@@@@@      @@@@@
      @@                 @@                           @@  @@
        @@@@@@@            @@@@@@@               @@@@@    @@
                                                          */
//. # sanctuary-type-identifiers
//.
//. A type is a set of values. Boolean, for example, is the type comprising
//. `true` and `false`. A value may be a member of multiple types (`42` is a
//. member of Number, PositiveNumber, Integer, and many other types).
//.
//. In certain situations it is useful to divide JavaScript values into
//. non-overlapping types. The language provides two constructs for this
//. purpose: the [`typeof`][1] operator and [`Object.prototype.toString`][2].
//. Each has pros and cons, but neither supports user-defined types.
//.
//. sanctuary-type-identifiers comprises:
//.
//.   - an npm and browser -compatible package for deriving the
//.     _type identifier_ of a JavaScript value; and
//.   - a specification which authors may follow to specify type
//.     identifiers for their types.
//.
//. ### Specification
//.
//. For a type to be compatible with the algorithm:
//.
//.   - every member of the type MUST have a `constructor` property
//.     pointing to an object known as the _type representative_;
//.
//.   - the type representative MUST have a `@@type` property
//.     (the _type identifier_); and
//.
//.   - the type identifier MUST be a string primitive and SHOULD have
//.     format `'<namespace>/<name>[@<version>]'`, where:
//.
//.       - `<namespace>` MUST consist of one or more characters, and
//.         SHOULD equal the name of the npm package which defines the
//.         type (including [scope][3] where appropriate);
//.
//.       - `<name>` MUST consist of one or more characters, and SHOULD
//.         be the unique name of the type; and
//.
//.       - `<version>` MUST consist of one or more digits, and SHOULD
//.         represent the version of the type.
//.
//. If the type identifier does not conform to the format specified above,
//. it is assumed that the entire string represents the _name_ of the type;
//. _namespace_ will be `null` and _version_ will be `0`.
//.
//. If the _version_ is not given, it is assumed to be `0`.
//.
//. For example:
//.
//. ```javascript
//. //  Identity :: a -> Identity a
//. function Identity(x) {
//.   if (!(this instanceof Identity)) return new Identity(x);
//.   this.value = x;
//. }
//.
//. Identity['@@type'] = 'my-package/Identity';
//. ```
//.
//. Note that by using a constructor function the `constructor` property is set
//. implicitly for each value created. Constructor functions are convenient for
//. this reason, but are not required. This definition is also valid:
//.
//. ```javascript
//. //  IdentityTypeRep :: TypeRep Identity
//. var IdentityTypeRep = {
//.   '@@type': 'my-package/Identity'
//. };
//.
//. //  Identity :: a -> Identity a
//. function Identity(x) {
//.   return {constructor: IdentityTypeRep, value: x};
//. }
//. ```

(function(f) {

  'use strict';

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd != null) {
    define([], f);
  } else {
    self.sanctuaryTypeIdentifiers = f();
  }

}(function() {

  'use strict';

  //  $$type :: String
  var $$type = '@@type';

  //  pattern :: RegExp
  var pattern = new RegExp(
    '^'
  + '([\\s\\S]+)'   //  <namespace>
  + '/'             //  SOLIDUS (U+002F)
  + '([\\s\\S]+?)'  //  <name>
  + '(?:'           //  optional non-capturing group {
  +   '@'           //    COMMERCIAL AT (U+0040)
  +   '([0-9]+)'    //    <version>
  + ')?'            //  }
  + '$'
  );

  //. ### Usage
  //.
  //. ```javascript
  //. const type = require('sanctuary-type-identifiers');
  //. ```
  //.
  //. ```javascript
  //. > function Identity(x) {
  //. .   if (!(this instanceof Identity)) return new Identity(x);
  //. .   this.value = x;
  //. . }
  //. . Identity['@@type'] = 'my-package/Identity@1';
  //.
  //. > type.parse(type(Identity(0)))
  //. {namespace: 'my-package', name: 'Identity', version: 1}
  //. ```
  //.
  //. ### API
  //.
  //# type :: Any -> String
  //.
  //. Takes any value and returns a string which identifies its type. If the
  //. value conforms to the [specification][4], the custom type identifier is
  //. returned.
  //.
  //. ```javascript
  //. > type(null)
  //. 'Null'
  //.
  //. > type(true)
  //. 'Boolean'
  //.
  //. > type(Identity(0))
  //. 'my-package/Identity@1'
  //. ```
  function type(x) {
    return x != null &&
           x.constructor != null &&
           x.constructor.prototype !== x &&
           typeof x.constructor[$$type] === 'string' ?
      x.constructor[$$type] :
      Object.prototype.toString.call(x).slice('[object '.length, -']'.length);
  }

  //# type.parse :: String -> { namespace :: Nullable String, name :: String, version :: Number }
  //.
  //. Takes any string and parses it according to the [specification][4],
  //. returning an object with `namespace`, `name`, and `version` fields.
  //.
  //. ```javascript
  //. > type.parse('my-package/List@2')
  //. {namespace: 'my-package', name: 'List', version: 2}
  //.
  //. > type.parse('nonsense!')
  //. {namespace: null, name: 'nonsense!', version: 0}
  //.
  //. > type.parse(Identity['@@type'])
  //. {namespace: 'my-package', name: 'Identity', version: 1}
  //. ```
  type.parse = function parse(s) {
    var groups = pattern.exec(s);
    return {
      namespace: groups == null || groups[1] == null ? null : groups[1],
      name:      groups == null                      ? s    : groups[2],
      version:   groups == null || groups[3] == null ? 0    : Number(groups[3])
    };
  };

  return type;

}));

//. [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof
//. [2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString
//. [3]: https://docs.npmjs.com/misc/scope
//. [4]: #specification

},{}],13:[function(require,module,exports) {
var define;
/*              ___                 ______
               /  /\               /  ___/\
        ______/  / / _______    __/  /___\/
       /  ___   / / /  ___  \  /_   __/\
      /  /\_/  / / /  /__/  /\ \/  /\_\/
     /  / //  / / /  ______/ / /  / /
    /  /_//  / / /  /______\/ /  / /
    \_______/ /  \_______/\  /__/ /
     \______\/    \______\/  \__*/

//. # sanctuary-def
//.
//. sanctuary-def is a run-time type system for JavaScript. It facilitates
//. the definition of curried JavaScript functions which are explicit about
//. the number of arguments to which they may be applied and the types of
//. those arguments.
//.
//. It is conventional to import the package as `$`:
//.
//. ```javascript
//. const $ = require('sanctuary-def');
//. ```
//.
//. The next step is to define an environment. An environment is an array
//. of [types][]. [`env`][] is an environment containing all the built-in
//. JavaScript types. It may be used as the basis for environments which
//. include custom types in addition to the built-in types:
//.
//. ```javascript
//. //    Integer :: Type
//. const Integer = ...;
//.
//. //    NonZeroInteger :: Type
//. const NonZeroInteger = ...;
//.
//. //    env :: Array Type
//. const env = $.env.concat([Integer, NonZeroInteger]);
//. ```
//.
//. Type constructors such as `List :: Type -> Type` cannot be included in
//. an environment as they're not of the correct type. One could, though,
//. use a type constructor to define a fixed number of concrete types:
//.
//. ```javascript
//. //    env :: Array Type
//. const env = $.env.concat([
//.   List($.Number),               // :: Type
//.   List($.String),               // :: Type
//.   List(List($.Number)),         // :: Type
//.   List(List($.String)),         // :: Type
//.   List(List(List($.Number))),   // :: Type
//.   List(List(List($.String))),   // :: Type
//. ]);
//. ```
//.
//. Not only would this be tedious, but one could never enumerate all possible
//. types as there are infinitely many. Instead, one should use [`Unknown`][]:
//.
//. ```javascript
//. //    env :: Array Type
//. const env = $.env.concat([List($.Unknown)]);
//. ```
//.
//. The next step is to define a `def` function for the environment:
//.
//. ```javascript
//. const def = $.create({checkTypes: true, env: env});
//. ```
//.
//. The `checkTypes` option determines whether type checking is enabled.
//. This allows one to only pay the performance cost of run-time type checking
//. during development. For example:
//.
//. ```javascript
//. const def = $.create({
//.   checkTypes: process.env.NODE_ENV === 'development',
//.   env: env,
//. });
//. ```
//.
//. `def` is a function for defining functions. For example:
//.
//. ```javascript
//. //    add :: Number -> Number -> Number
//. const add =
//. def('add', {}, [$.Number, $.Number, $.Number], (x, y) => x + y);
//. ```
//.
//. `[$.Number, $.Number, $.Number]` specifies that `add` takes two arguments
//. of type `Number` and returns a value of type `Number`.
//.
//. Applying `add` to two arguments gives the expected result:
//.
//. ```javascript
//. add(2, 2);
//. // => 4
//. ```
//.
//. Applying `add` to greater than two arguments results in an exception being
//. thrown:
//.
//. ```javascript
//. add(2, 2, 2);
//. // ! TypeError: ‘add’ requires two arguments; received three arguments
//. ```
//.
//. Applying `add` to fewer than two arguments results in a function
//. awaiting the remaining arguments. This is known as partial application.
//. Partial application is convenient as it allows more specific functions
//. to be defined in terms of more general ones:
//.
//. ```javascript
//. //    inc :: Number -> Number
//. const inc = add(1);
//.
//. inc(7);
//. // => 8
//. ```
//.
//. JavaScript's implicit type coercion often obfuscates the source of type
//. errors. Consider the following function:
//.
//. ```javascript
//. //    _add :: (Number, Number) -> Number
//. const _add = (x, y) => x + y;
//. ```
//.
//. The type signature indicates that `_add` takes two arguments of type
//. `Number`, but this is not enforced. This allows type errors to be silently
//. ignored:
//.
//. ```javascript
//. _add('2', '2');
//. // => '22'
//. ```
//.
//. `add`, on the other hand, throws if applied to arguments of the wrong
//. types:
//.
//. ```javascript
//. add('2', '2');
//. // ! TypeError: Invalid value
//. //
//. //   add :: Number -> Number -> Number
//. //          ^^^^^^
//. //            1
//. //
//. //   1)  "2" :: String
//. //
//. //   The value at position 1 is not a member of ‘Number’.
//. ```
//.
//. Type checking is performed as arguments are provided (rather than once all
//. arguments have been provided), so type errors are reported early:
//.
//. ```javascript
//. add('X');
//. // ! TypeError: Invalid value
//. //
//. //   add :: Number -> Number -> Number
//. //          ^^^^^^
//. //            1
//. //
//. //   1)  "X" :: String
//. //
//. //   The value at position 1 is not a member of ‘Number’.
//. ```

(function(f) {

  'use strict';

  /* istanbul ignore else */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f(require('sanctuary-type-classes'),
                       require('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define(['sanctuary-type-classes', 'sanctuary-type-identifiers'], f);
  } else {
    self.sanctuaryDef = f(self.sanctuaryTypeClasses,
                          self.sanctuaryTypeIdentifiers);
  }

}(function(Z, type) {

  'use strict';

  //# __ :: Placeholder
  //.
  //. The special placeholder value.
  //.
  //. One may wish to partially apply a function whose parameters are in the
  //. "wrong" order. Functions defined via sanctuary-def accommodate this by
  //. accepting placeholders for arguments yet to be provided. For example:
  //.
  //. ```javascript
  //. //    concatS :: String -> String -> String
  //. const concatS =
  //. def('concatS', {}, [$.String, $.String, $.String], (x, y) => x + y);
  //.
  //. //    exclaim :: String -> String
  //. const exclaim = concatS($.__, '!');
  //.
  //. exclaim('ahoy');
  //. // => 'ahoy!'
  //. ```
  var __ = {'@@functional/placeholder': true};

  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

  var slice             = Array.prototype.slice;
  var hasOwnProperty    = Object.prototype.hasOwnProperty;

  function Either(tag, value) {
    this.isLeft = tag === 'Left';
    this.isRight = tag === 'Right';
    this.value = value;
  }

  Either['@@type'] = 'sanctuary-def/Either';

  Either.prototype['fantasy-land/map'] = function(f) {
    return this.isLeft ? this : Right(f(this.value));
  };

  Either.prototype['fantasy-land/chain'] = function(f) {
    return this.isLeft ? this : f(this.value);
  };

  //  Left :: a -> Either a b
  function Left(x) { return new Either('Left', x); }

  //  Right :: b -> Either a b
  function Right(x) { return new Either('Right', x); }

  //  K :: a -> b -> a
  function K(x) { return function(y) { return x; }; }

  //  always2 :: a -> (b, c) -> a
  function always2(x) { return function(y, z) { return x; }; }

  //  id :: a -> a
  function id(x) { return x; }

  //  init :: Array a -> Array a
  function init(xs) { return xs.slice(0, -1); }

  //  isEmpty :: Array a -> Boolean
  function isEmpty(xs) { return xs.length === 0; }

  //  isPrefix :: Array a -> Array a -> Boolean
  function isPrefix(candidate) {
    return function(xs) {
      if (candidate.length > xs.length) return false;
      for (var idx = 0; idx < candidate.length; idx += 1) {
        if (candidate[idx] !== xs[idx]) return false;
      }
      return true;
    };
  }

  //  last :: Array a -> a
  function last(xs) { return xs[xs.length - 1]; }

  //  memberOf :: Array a -> a -> Boolean
  function memberOf(xs) {
    return function(y) {
      return xs.some(function(x) { return Z.equals(x, y); });
    };
  }

  //  or :: (Array a, Array a) -> Array a
  function or(xs, ys) { return isEmpty(xs) ? ys : xs; }

  //  range :: (Number, Number) -> Array Number
  function range(start, stop) {
    var result = [];
    for (var n = start; n < stop; n += 1) result.push(n);
    return result;
  }

  //  singleton :: (String, a) -> StrMap a
  function singleton(k, v) {
    var result = {};
    result[k] = v;
    return result;
  }

  //  strRepeat :: (String, Integer) -> String
  function strRepeat(s, times) {
    return Array(times + 1).join(s);
  }

  //  r :: Char -> String -> String
  function r(c) {
    return function(s) {
      return strRepeat(c, s.length);
    };
  }

  //  _ :: String -> String
  var _ = r(' ');

  //  stripOutermostParens :: String -> String
  function stripOutermostParens(s) {
    return s.slice('('.length, -')'.length);
  }

  //  toMarkdownList :: (String, String, a -> String, Array a) -> String
  function toMarkdownList(empty, s, f, xs) {
    return isEmpty(xs) ?
      empty :
      Z.reduce(function(s, x) { return s + '  - ' + f(x) + '\n'; }, s, xs);
  }

  //  trimTrailingSpaces :: String -> String
  function trimTrailingSpaces(s) {
    return s.replace(/[ ]+$/gm, '');
  }

  //  unless :: (Boolean, (a -> a), a) -> a
  function unless(bool, f, x) {
    return bool ? x : f(x);
  }

  //  when :: (Boolean, (a -> a), a) -> a
  function when(bool, f, x) {
    return bool ? f(x) : x;
  }

  //  wrap :: String -> String -> String -> String
  function wrap(prefix) {
    return function(suffix) {
      return function(s) {
        return prefix + s + suffix;
      };
    };
  }

  //  parenthesize :: String -> String
  var parenthesize = wrap('(')(')');

  //  q :: String -> String
  var q = wrap('\u2018')('\u2019');

  //  stripNamespace :: String -> String
  function stripNamespace(s) { return s.slice(s.indexOf('/') + 1); }

  //  _Type :: ... -> Type
  function _Type(
    type,       // :: String
    name,       // :: String
    url,        // :: String
    format,     // :: (String -> String, String -> String -> String) -> String
    test,       // :: Any -> Boolean
    keys,       // :: Array String
    types       // :: StrMap { extractor :: a -> Array b, type :: Type }
  ) {
    this._test = test;
    this.format = format;
    this.keys = keys;
    this.name = name;
    this.type = type;
    this.types = types;
    this.url = url;
  }

  _Type['@@type'] = 'sanctuary-def/Type';

  _Type.prototype.validate = function(x) {
    if (!this._test(x)) return Left({value: x, propPath: []});
    for (var idx = 0; idx < this.keys.length; idx += 1) {
      var k = this.keys[idx];
      var t = this.types[k];
      for (var idx2 = 0, ys = t.extractor(x); idx2 < ys.length; idx2 += 1) {
        var result = t.type.validate(ys[idx2]);
        if (result.isLeft) {
          var value = result.value.value;
          var propPath = Z.concat([k], result.value.propPath);
          return Left({value: value, propPath: propPath});
        }
      }
    }
    return Right(x);
  };

  _Type.prototype.toString = function() {
    return this.format(id, K(id));
  };

  var BINARY        = 'BINARY';
  var FUNCTION      = 'FUNCTION';
  var INCONSISTENT  = 'INCONSISTENT';
  var NULLARY       = 'NULLARY';
  var RECORD        = 'RECORD';
  var UNARY         = 'UNARY';
  var UNKNOWN       = 'UNKNOWN';
  var VARIABLE      = 'VARIABLE';

  //  Inconsistent :: Type
  var Inconsistent =
  new _Type(INCONSISTENT, '', '', always2('???'), K(false), [], {});

  //  typeEq :: String -> a -> Boolean
  function typeEq(name) {
    return function(x) {
      return type(x) === name;
    };
  }

  //  typeofEq :: String -> a -> Boolean
  function typeofEq(typeof_) {
    return function(x) {
      // eslint-disable-next-line valid-typeof
      return typeof x === typeof_;
    };
  }

  //  functionUrl :: String -> String
  function functionUrl(name) {
    var version = '0.14.0';  // updated programmatically
    return 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version +
           '#' + stripNamespace(name);
  }

  //  NullaryTypeWithUrl :: (String, Any -> Boolean) -> Type
  function NullaryTypeWithUrl(name, test) {
    return NullaryType(name, functionUrl(name), test);
  }

  //  EnumTypeWithUrl :: (String, Array Any) -> Type
  function EnumTypeWithUrl(name, members) {
    return EnumType(name, functionUrl(name), members);
  }

  //  UnaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a -> Array a) -> (Type -> Type)
  function UnaryTypeWithUrl(name, test, _1) {
    return UnaryType(name, functionUrl(name), test, _1);
  }

  //  BinaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a b -> Array a, t a b -> Array b) ->
  //      ((Type, Type) -> Type)
  function BinaryTypeWithUrl(name, test, _1, _2) {
    return BinaryType(name, functionUrl(name), test, _1, _2);
  }

  //. ### Types
  //.
  //. Conceptually, a type is a set of values. One can think of a value of
  //. type `Type` as a function of type `Any -> Boolean` which tests values
  //. for membership in the set (though this is an oversimplification).

  //# Any :: Type
  //.
  //. Type comprising every JavaScript value.
  var Any = NullaryTypeWithUrl('sanctuary-def/Any', K(true));

  //# AnyFunction :: Type
  //.
  //. Type comprising every Function value.
  var AnyFunction = NullaryTypeWithUrl('Function', typeofEq('function'));

  //# Arguments :: Type
  //.
  //. Type comprising every [`arguments`][arguments] object.
  var Arguments = NullaryTypeWithUrl('Arguments', typeEq('Arguments'));

  //# Array :: Type -> Type
  //.
  //. Constructor for homogeneous Array types.
  var Array_ = UnaryTypeWithUrl('Array', typeEq('Array'), id);

  //# Boolean :: Type
  //.
  //. Type comprising `true` and `false`.
  var Boolean_ = NullaryTypeWithUrl('Boolean', typeofEq('boolean'));

  //# Date :: Type
  //.
  //. Type comprising every Date value.
  var Date_ = NullaryTypeWithUrl('Date', typeEq('Date'));

  //# Error :: Type
  //.
  //. Type comprising every Error value, including values of more specific
  //. constructors such as [`SyntaxError`][] and [`TypeError`][].
  var Error_ = NullaryTypeWithUrl('Error', typeEq('Error'));

  //# FiniteNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `Infinity` and
  //. `-Infinity`.
  var FiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/FiniteNumber',
    function(x) { return ValidNumber._test(x) && isFinite(x); }
  );

  //# Function :: Array Type -> Type
  //.
  //. Constructor for Function types.
  //.
  //. Examples:
  //.
  //.   - `$.Function([$.Date, $.String])` represents the `Date -> String`
  //.     type; and
  //.   - `$.Function([a, b, a])` represents the `(a, b) -> a` type.
  function Function_(types) {
    function format(outer, inner) {
      var xs = types.map(function(t, idx) {
        return unless(t.type === RECORD || isEmpty(t.keys),
                      stripOutermostParens,
                      inner('$' + String(idx + 1))(String(t)));
      });
      var parenthesize = wrap(outer('('))(outer(')'));
      return parenthesize(unless(types.length === 2,
                                 parenthesize,
                                 init(xs).join(outer(', '))) +
                          outer(' -> ') +
                          last(xs));
    }

    var test = AnyFunction._test;

    var $keys = [];
    var $types = {};
    types.forEach(function(t, idx) {
      var k = '$' + String(idx + 1);
      $keys.push(k);
      $types[k] = {extractor: K([]), type: t};
    });

    return new _Type(FUNCTION, '', '', format, test, $keys, $types);
  }

  //# GlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `true`.
  //.
  //. See also [`NonGlobalRegExp`][].
  var GlobalRegExp = NullaryTypeWithUrl(
    'sanctuary-def/GlobalRegExp',
    function(x) { return RegExp_._test(x) && x.global; }
  );

  //# Integer :: Type
  //.
  //. Type comprising every integer in the range
  //. [[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].
  var Integer = NullaryTypeWithUrl(
    'sanctuary-def/Integer',
    function(x) {
      return ValidNumber._test(x) &&
             Math.floor(x) === x &&
             x >= MIN_SAFE_INTEGER &&
             x <= MAX_SAFE_INTEGER;
    }
  );

  //# NegativeFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value less than zero.
  var NegativeFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/NegativeFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x < 0; }
  );

  //# NegativeInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value less than zero.
  var NegativeInteger = NullaryTypeWithUrl(
    'sanctuary-def/NegativeInteger',
    function(x) { return Integer._test(x) && x < 0; }
  );

  //# NegativeNumber :: Type
  //.
  //. Type comprising every [`Number`][] value less than zero.
  var NegativeNumber = NullaryTypeWithUrl(
    'sanctuary-def/NegativeNumber',
    function(x) { return Number_._test(x) && x < 0; }
  );

  //# NonEmpty :: Type -> Type
  //.
  //. Constructor for non-empty types. `$.NonEmpty($.String)`, for example, is
  //. the type comprising every [`String`][] value except `''`.
  //.
  //. The given type must satisfy the [Monoid][] and [Setoid][] specifications.
  var NonEmpty = UnaryType(
    'sanctuary-def/NonEmpty',
    functionUrl('NonEmpty'),
    function(x) {
      return Z.Monoid.test(x) &&
             Z.Setoid.test(x) &&
             !Z.equals(x, Z.empty(x.constructor));
    },
    function(monoid) { return [monoid]; }
  );

  //# NonGlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `false`.
  //.
  //. See also [`GlobalRegExp`][].
  var NonGlobalRegExp = NullaryTypeWithUrl(
    'sanctuary-def/NonGlobalRegExp',
    function(x) { return RegExp_._test(x) && !x.global; }
  );

  //# NonNegativeInteger :: Type
  //.
  //. Type comprising every non-negative [`Integer`][] value (including `-0`).
  //. Also known as the set of natural numbers under ISO 80000-2:2009.
  var NonNegativeInteger = NullaryTypeWithUrl(
    'sanctuary-def/NonNegativeInteger',
    function(x) { return Integer._test(x) && x >= 0; }
  );

  //# NonZeroFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value except `0` and `-0`.
  var NonZeroFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x !== 0; }
  );

  //# NonZeroInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value except `0` and `-0`.
  var NonZeroInteger = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroInteger',
    function(x) { return Integer._test(x) && x !== 0; }
  );

  //# NonZeroValidNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `0` and `-0`.
  var NonZeroValidNumber = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroValidNumber',
    function(x) { return ValidNumber._test(x) && x !== 0; }
  );

  //# Null :: Type
  //.
  //. Type whose sole member is `null`.
  var Null = NullaryTypeWithUrl('Null', typeEq('Null'));

  //# Nullable :: Type -> Type
  //.
  //. Constructor for types which include `null` as a member.
  var Nullable = UnaryTypeWithUrl(
    'sanctuary-def/Nullable',
    K(true),
    function(nullable) {
      // eslint-disable-next-line eqeqeq
      return nullable === null ? [] : [nullable];
    }
  );

  //# Number :: Type
  //.
  //. Type comprising every primitive Number value (including `NaN`).
  var Number_ = NullaryTypeWithUrl('Number', typeofEq('number'));

  //# Object :: Type
  //.
  //. Type comprising every "plain" Object value. Specifically, values
  //. created via:
  //.
  //.   - object literal syntax;
  //.   - [`Object.create`][]; or
  //.   - the `new` operator in conjunction with `Object` or a custom
  //.     constructor function.
  var Object_ = NullaryTypeWithUrl('Object', typeEq('Object'));

  //# Pair :: Type -> Type -> Type
  //.
  //. Constructor for tuple types of length 2. Arrays are said to represent
  //. tuples. `['foo', 42]` is a member of `Pair String Number`.
  var Pair = BinaryTypeWithUrl(
    'sanctuary-def/Pair',
    function(x) { return typeEq('Array')(x) && x.length === 2; },
    function(pair) { return [pair[0]]; },
    function(pair) { return [pair[1]]; }
  );

  //# PositiveFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value greater than zero.
  var PositiveFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/PositiveFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x > 0; }
  );

  //# PositiveInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value greater than zero.
  var PositiveInteger = NullaryTypeWithUrl(
    'sanctuary-def/PositiveInteger',
    function(x) { return Integer._test(x) && x > 0; }
  );

  //# PositiveNumber :: Type
  //.
  //. Type comprising every [`Number`][] value greater than zero.
  var PositiveNumber = NullaryTypeWithUrl(
    'sanctuary-def/PositiveNumber',
    function(x) { return Number_._test(x) && x > 0; }
  );

  //# RegExp :: Type
  //.
  //. Type comprising every RegExp value.
  var RegExp_ = NullaryTypeWithUrl('RegExp', typeEq('RegExp'));

  //# RegexFlags :: Type
  //.
  //. Type comprising the canonical RegExp flags:
  //.
  //.   - `''`
  //.   - `'g'`
  //.   - `'i'`
  //.   - `'m'`
  //.   - `'gi'`
  //.   - `'gm'`
  //.   - `'im'`
  //.   - `'gim'`
  var RegexFlags = EnumTypeWithUrl(
    'sanctuary-def/RegexFlags',
    ['', 'g', 'i', 'm', 'gi', 'gm', 'im', 'gim']
  );

  //# StrMap :: Type -> Type
  //.
  //. Constructor for homogeneous Object types.
  //.
  //. `{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
  //. `{foo: 1, bar: 2, baz: 'XXX'}` is not.
  var StrMap = UnaryTypeWithUrl(
    'sanctuary-def/StrMap',
    Object_._test,
    function(strMap) {
      return Z.reduce(function(xs, x) { return xs.concat([x]); }, [], strMap);
    }
  );

  //# String :: Type
  //.
  //. Type comprising every primitive String value.
  var String_ = NullaryTypeWithUrl('String', typeofEq('string'));

  //# Symbol :: Type
  //.
  //. Type comprising every Symbol value.
  var Symbol_ = NullaryTypeWithUrl('Symbol', typeofEq('symbol'));

  //# Type :: Type
  //.
  //. Type comprising every `Type` value.
  var Type = NullaryTypeWithUrl('Type', typeEq('sanctuary-def/Type'));

  //# TypeClass :: Type
  //.
  //. Type comprising every [`TypeClass`][] value.
  var TypeClass =
  NullaryTypeWithUrl('TypeClass', typeEq('sanctuary-type-classes/TypeClass'));

  //# Undefined :: Type
  //.
  //. Type whose sole member is `undefined`.
  var Undefined = NullaryTypeWithUrl('Undefined', typeEq('Undefined'));

  //# Unknown :: Type
  //.
  //. Type used to represent missing type information. The type of `[]`,
  //. for example, is `Array ???`.
  //.
  //. May be used with type constructors when defining environments. Given a
  //. type constructor `List :: Type -> Type`, one could use `List($.Unknown)`
  //. to include an infinite number of types in an environment:
  //.
  //.   - `List Number`
  //.   - `List String`
  //.   - `List (List Number)`
  //.   - `List (List String)`
  //.   - `List (List (List Number))`
  //.   - `List (List (List String))`
  //.   - `...`
  var Unknown =
  new _Type(UNKNOWN, '', '', always2('Unknown'), K(true), [], {});

  //# ValidDate :: Type
  //.
  //. Type comprising every [`Date`][] value except `new Date(NaN)`.
  var ValidDate = NullaryTypeWithUrl(
    'sanctuary-def/ValidDate',
    function(x) { return Date_._test(x) && !isNaN(x.valueOf()); }
  );

  //# ValidNumber :: Type
  //.
  //. Type comprising every [`Number`][] value except `NaN`.
  var ValidNumber = NullaryTypeWithUrl(
    'sanctuary-def/ValidNumber',
    function(x) { return Number_._test(x) && !isNaN(x); }
  );

  //# env :: Array Type
  //.
  //. An array of [types][]:
  //.
  //.   - <code>[AnyFunction](#AnyFunction)</code>
  //.   - <code>[Arguments](#Arguments)</code>
  //.   - <code>[Array](#Array)([Unknown](#Unknown))</code>
  //.   - <code>[Boolean](#Boolean)</code>
  //.   - <code>[Date](#Date)</code>
  //.   - <code>[Error](#Error)</code>
  //.   - <code>[Null](#Null)</code>
  //.   - <code>[Number](#Number)</code>
  //.   - <code>[Object](#Object)</code>
  //.   - <code>[RegExp](#RegExp)</code>
  //.   - <code>[StrMap](#StrMap)([Unknown](#Unknown))</code>
  //.   - <code>[String](#String)</code>
  //.   - <code>[Symbol](#Symbol)</code>
  //.   - <code>[Undefined](#Undefined)</code>
  var env = [
    AnyFunction,
    Arguments,
    Array_(Unknown),
    Boolean_,
    Date_,
    Error_,
    Null,
    Number_,
    Object_,
    RegExp_,
    StrMap(Unknown),
    String_,
    Symbol_,
    Undefined
  ];

  //  Unchecked :: String -> Type
  function Unchecked(s) { return NullaryType(s, '', K(true)); }

  var def = _create({checkTypes: true, env: env});

  //  arity :: (Number, Function) -> Function
  function arity(n, f) {
    return (
      n === 0 ?
        function() {
          return f.apply(this, arguments);
        } :
      n === 1 ?
        function($1) {
          return f.apply(this, arguments);
        } :
      n === 2 ?
        function($1, $2) {
          return f.apply(this, arguments);
        } :
      n === 3 ?
        function($1, $2, $3) {
          return f.apply(this, arguments);
        } :
      n === 4 ?
        function($1, $2, $3, $4) {
          return f.apply(this, arguments);
        } :
      n === 5 ?
        function($1, $2, $3, $4, $5) {
          return f.apply(this, arguments);
        } :
      n === 6 ?
        function($1, $2, $3, $4, $5, $6) {
          return f.apply(this, arguments);
        } :
      n === 7 ?
        function($1, $2, $3, $4, $5, $6, $7) {
          return f.apply(this, arguments);
        } :
      n === 8 ?
        function($1, $2, $3, $4, $5, $6, $7, $8) {
          return f.apply(this, arguments);
        } :
      // else
        function($1, $2, $3, $4, $5, $6, $7, $8, $9) {
          return f.apply(this, arguments);
        }
    );
  }

  //  numArgs :: Number -> String
  function numArgs(n) {
    switch (n) {
      case  0:  return  'zero arguments';
      case  1:  return   'one argument';
      case  2:  return   'two arguments';
      case  3:  return 'three arguments';
      case  4:  return  'four arguments';
      case  5:  return  'five arguments';
      case  6:  return   'six arguments';
      case  7:  return 'seven arguments';
      case  8:  return 'eight arguments';
      case  9:  return  'nine arguments';
      default:  return  n + ' arguments';
    }
  }

  //  expandUnknown :: ... -> Array Type
  function expandUnknown(
    env,            // :: Array Type
    seen,           // :: Array Object
    value,          // :: Any
    r               // :: { extractor :: a -> Array b, type :: Type }
  ) {
    return r.type.type === UNKNOWN ?
      _determineActualTypes(env, seen, r.extractor(value)) :
      [r.type];
  }

  //  _determineActualTypes :: ... -> Array Type
  function _determineActualTypes(
    env,            // :: Array Type
    seen,           // :: Array Object
    values          // :: Array Any
  ) {
    function refine(types, value) {
      var seen$;
      if (typeof value === 'object' && value != null ||
          typeof value === 'function') {
        //  Abort if a circular reference is encountered; add the current
        //  object to the array of seen objects otherwise.
        if (seen.indexOf(value) >= 0) return [];
        seen$ = Z.concat(seen, [value]);
      } else {
        seen$ = seen;
      }
      return Z.chain(function(t) {
        return (
          t.name === 'sanctuary-def/Nullable' || t.validate(value).isLeft ?
            [] :
          t.type === UNARY ?
            Z.map(fromUnaryType(t),
                  expandUnknown(env, seen$, value, t.types.$1)) :
          t.type === BINARY ?
            xprod(t,
                  expandUnknown(env, seen$, value, t.types.$1),
                  expandUnknown(env, seen$, value, t.types.$2)) :
          // else
            [t]
        );
      }, types);
    }

    return isEmpty(values) ?
      [Unknown] :
      or(Z.reduce(refine, env, values), [Inconsistent]);
  }

  //  isConsistent :: Type -> Boolean
  function isConsistent(t) {
    return t.type === UNARY   ? isConsistent(t.types.$1.type) :
           t.type === BINARY  ? isConsistent(t.types.$1.type) &&
                                isConsistent(t.types.$2.type) :
           /* else */           t.type !== INCONSISTENT;
  }

  //  determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
  function determineActualTypesStrict(env, values) {
    return _determineActualTypes(env, [], values)
           .filter(isConsistent);
  }

  //  determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
  function determineActualTypesLoose(env, values) {
    return _determineActualTypes(env, [], values)
           .filter(function(t) { return t.type !== INCONSISTENT; });
  }

  //  TypeInfo = { name :: String
  //             , constraints :: StrMap (Array TypeClass)
  //             , types :: Array Type }
  //
  //  TypeVarMap = StrMap { types :: Array Type
  //                      , valuesByPath :: StrMap (Array Any) }
  //
  //  PropPath = Array (Number | String)

  //  updateTypeVarMap :: ... -> TypeVarMap
  function updateTypeVarMap(
    env,            // :: Array Type
    typeVarMap,     // :: TypeVarMap
    typeVar,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) {
    var $typeVarMap = {};
    for (var typeVarName in typeVarMap) {
      var entry = typeVarMap[typeVarName];
      var $entry = {types: entry.types.slice(), valuesByPath: {}};
      for (var k in entry.valuesByPath) {
        $entry.valuesByPath[k] = entry.valuesByPath[k].slice();
      }
      $typeVarMap[typeVarName] = $entry;
    }
    if (!hasOwnProperty.call($typeVarMap, typeVar.name)) {
      $typeVarMap[typeVar.name] = {types: env.slice(), valuesByPath: {}};
    }

    var key = JSON.stringify(Z.concat([index], propPath));
    if (!hasOwnProperty.call($typeVarMap[typeVar.name].valuesByPath, key)) {
      $typeVarMap[typeVar.name].valuesByPath[key] = [];
    }

    var isNullaryTypeVar = isEmpty(typeVar.keys);

    values.forEach(function(value) {
      $typeVarMap[typeVar.name].valuesByPath[key].push(value);
      $typeVarMap[typeVar.name].types = Z.chain(
        function(t) {
          var xs;
          var invalid = !test(env, t, value);
          return (
            invalid ?
              [] :
            t.type === UNARY ?
              isNullaryTypeVar &&
              t.types.$1.type.type === UNKNOWN &&
              !isEmpty(xs = t.types.$1.extractor(value)) ?
                Z.map(fromUnaryType(t),
                      determineActualTypesStrict(env, xs)) :
                [t] :
            t.type === BINARY ?
              isNullaryTypeVar ?
                xprod(t,
                      t.types.$1.type.type === UNKNOWN &&
                      !isEmpty(xs = t.types.$1.extractor(value)) ?
                        determineActualTypesStrict(env, xs) :
                        [t.types.$1.type],
                      t.types.$2.type.type === UNKNOWN &&
                      !isEmpty(xs = t.types.$2.extractor(value)) ?
                        determineActualTypesStrict(env, xs) :
                        [t.types.$2.type]) :
                [t] :
            // else
              [t]
          );
        },
        $typeVarMap[typeVar.name].types
      );
    });

    return $typeVarMap;
  }

  //  underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
  function underlineTypeVars(typeInfo, valuesByPath) {
    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var paths = Z.map(JSON.parse, Object.keys(valuesByPath).sort());
    return underline(
      typeInfo,
      K(K(_)),
      function(index) {
        return function(f) {
          return function(t) {
            return function(propPath) {
              var indexedPropPath = Z.concat([index], propPath);
              return function(s) {
                if (paths.some(isPrefix(indexedPropPath))) {
                  var key = JSON.stringify(indexedPropPath);
                  if (!hasOwnProperty.call(valuesByPath, key)) return s;
                  if (!isEmpty(valuesByPath[key])) return f(s);
                }
                return _(s);
              };
            };
          };
        };
      }
    );
  }

  //  satisfactoryTypes ::
  //    ... -> Either (() -> Error) { typeVarMap :: TypeVarMap
  //                                , types :: Array Type }
  function satisfactoryTypes(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeVarMap,     // :: TypeVarMap
    expType,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) {
    var recur = satisfactoryTypes;

    for (var idx = 0; idx < values.length; idx += 1) {
      var result = expType.validate(values[idx]);
      if (result.isLeft) {
        return Left(function() {
          return invalidValue(env,
                              typeInfo,
                              index,
                              result.value.propPath,
                              result.value.value);
        });
      }
    }

    switch (expType.type) {

      case VARIABLE:
        var typeVarName = expType.name;
        var constraints = typeInfo.constraints;
        if (hasOwnProperty.call(constraints, typeVarName)) {
          var typeClasses = constraints[typeVarName];
          for (idx = 0; idx < values.length; idx += 1) {
            for (var idx2 = 0; idx2 < typeClasses.length; idx2 += 1) {
              if (!typeClasses[idx2].test(values[idx])) {
                return Left(function() {
                  return typeClassConstraintViolation(
                    env,
                    typeInfo,
                    typeClasses[idx2],
                    index,
                    propPath,
                    values[idx],
                    typeVarMap
                  );
                });
              }
            }
          }
        }

        var typeVarMap$ = updateTypeVarMap(env,
                                           typeVarMap,
                                           expType,
                                           index,
                                           propPath,
                                           values);

        var okTypes = typeVarMap$[typeVarName].types;
        return isEmpty(okTypes) && !isEmpty(values) ?
          Left(function() {
            return typeVarConstraintViolation(
              env,
              typeInfo,
              index,
              propPath,
              typeVarMap$[typeVarName].valuesByPath
            );
          }) :
          Z.reduce(function(e, t) {
            return isEmpty(expType.keys) || isEmpty(t.keys) ?
              e :
              Z.chain(function(r) {
                //  The `a` in `Functor f => f a` corresponds to the `a`
                //  in `Maybe a` but to the `b` in `Either a b`. A type
                //  variable's $1 will correspond to either $1 or $2 of
                //  the actual type depending on the actual type's arity.
                var offset = t.keys.length - expType.keys.length;
                return expType.keys.reduce(function(e, k, idx) {
                  var extractor = t.types[t.keys[offset + idx]].extractor;
                  var innerValues = Z.chain(extractor, values);
                  return Z.chain(
                    function(r) {
                      return recur(env,
                                   typeInfo,
                                   r.typeVarMap,
                                   expType.types[k].type,
                                   index,
                                   Z.concat(propPath, [k]),
                                   innerValues);
                    },
                    Z.reduce(function(e, x) {
                      var t = expType.types[k].type;
                      return Z.chain(function(r) {
                        return test(env, t, x) ? Right(r) : Left(function() {
                          var propPath$ = Z.concat(propPath, [k]);
                          return t.type === VARIABLE ?
                            typeVarConstraintViolation(
                              env,
                              typeInfo,
                              index,
                              propPath$,
                              singleton(JSON.stringify(Z.concat([index],
                                                                propPath$)),
                                        [x])
                            ) :
                            invalidValue(env, typeInfo, index, propPath$, x);
                        });
                      }, e);
                    }, e, innerValues)
                  );
                }, Right(r));
              }, e);
          }, Right({typeVarMap: typeVarMap$, types: okTypes}), okTypes);

      case UNARY:
        return Z.map(
          function(result) {
            return {
              typeVarMap: result.typeVarMap,
              types: Z.map(fromUnaryType(expType),
                           or(result.types, [expType.types.$1.type]))
            };
          },
          recur(env,
                typeInfo,
                typeVarMap,
                expType.types.$1.type,
                index,
                Z.concat(propPath, ['$1']),
                Z.chain(expType.types.$1.extractor, values))
        );

      case BINARY:
        return Z.chain(
          function(result) {
            var $1s = result.types;
            return Z.map(
              function(result) {
                var $2s = result.types;
                return {
                  typeVarMap: result.typeVarMap,
                  types: xprod(expType,
                               or($1s, [expType.types.$1.type]),
                               or($2s, [expType.types.$2.type]))
                };
              },
              recur(env,
                    typeInfo,
                    result.typeVarMap,
                    expType.types.$2.type,
                    index,
                    Z.concat(propPath, ['$2']),
                    Z.chain(expType.types.$2.extractor, values))
            );
          },
          recur(env,
                typeInfo,
                typeVarMap,
                expType.types.$1.type,
                index,
                Z.concat(propPath, ['$1']),
                Z.chain(expType.types.$1.extractor, values))
        );

      case RECORD:
        return Z.reduce(function(e, k) {
          return Z.chain(function(r) {
            return recur(env,
                         typeInfo,
                         r.typeVarMap,
                         expType.types[k].type,
                         index,
                         Z.concat(propPath, [k]),
                         Z.chain(expType.types[k].extractor, values));
          }, e);
        }, Right({typeVarMap: typeVarMap, types: [expType]}), expType.keys);

      default:
        return Right({typeVarMap: typeVarMap, types: [expType]});
    }
  }

  //# test :: Array Type -> Type -> a -> Boolean
  //.
  //. Takes an environment, a type, and any value. Returns `true` if the value
  //. is a member of the type; `false` otherwise.
  //.
  //. The environment is only significant if the type contains
  //. [type variables][].
  //.
  //. One may define a more restrictive type in terms of a more general one:
  //.
  //. ```javascript
  //. //    NonNegativeInteger :: Type
  //. const NonNegativeInteger = $.NullaryType(
  //.   'my-package/NonNegativeInteger',
  //.   'http://example.com/my-package#NonNegativeInteger',
  //.   x => $.test([], $.Integer, x) && x >= 0
  //. );
  //. ```
  //.
  //. Using types as predicates is useful in other contexts too. One could,
  //. for example, define a [record type][] for each endpoint of a REST API
  //. and validate the bodies of incoming POST requests against these types.
  function test(env, t, x) {
    var typeInfo = {name: 'name', constraints: {}, types: [t]};
    return satisfactoryTypes(env, typeInfo, {}, t, 0, [], [x]).isRight;
  }

  //. ### Type constructors
  //.
  //. sanctuary-def provides several functions for defining types.

  //# NullaryType :: String -> String -> (Any -> Boolean) -> Type
  //.
  //. Type constructor for types with no type variables (such as [`Number`][]).
  //.
  //. To define a nullary type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`); and
  //.
  //.   - a predicate which accepts any JavaScript value and returns `true` if
  //.     (and only if) the value is a member of `t`.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Integer :: Type
  //. const Integer = $.NullaryType(
  //.   'my-package/Integer',
  //.   'http://example.com/my-package#Integer',
  //.   x => typeof x === 'number' &&
  //.        Math.floor(x) === x &&
  //.        x >= Number.MIN_SAFE_INTEGER &&
  //.        x <= Number.MAX_SAFE_INTEGER
  //. );
  //.
  //. //    NonZeroInteger :: Type
  //. const NonZeroInteger = $.NullaryType(
  //.   'my-package/NonZeroInteger',
  //.   'http://example.com/my-package#NonZeroInteger',
  //.   x => $.test([], Integer, x) && x !== 0
  //. );
  //.
  //. //    rem :: Integer -> NonZeroInteger -> Integer
  //. const rem =
  //. def('rem', {}, [Integer, NonZeroInteger, Integer], (x, y) => x % y);
  //.
  //. rem(42, 5);
  //. // => 2
  //.
  //. rem(0.5);
  //. // ! TypeError: Invalid value
  //. //
  //. //   rem :: Integer -> NonZeroInteger -> Integer
  //. //          ^^^^^^^
  //. //             1
  //. //
  //. //   1)  0.5 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘Integer’.
  //.
  //. rem(42, 0);
  //. // ! TypeError: Invalid value
  //. //
  //. //   rem :: Integer -> NonZeroInteger -> Integer
  //. //                     ^^^^^^^^^^^^^^
  //. //                           1
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘NonZeroInteger’.
  //. ```
  function NullaryType(name, url, test) {
    function format(outer, inner) {
      return outer(stripNamespace(name));
    }
    return new _Type(NULLARY, name, url, format, test, [], {});
  }

  var CheckedNullaryType =
  def('NullaryType',
      {},
      [String_, String_, Function_([Any, Boolean_]), Type],
      NullaryType);

  //# UnaryType :: String -> String -> (Any -> Boolean) -> (t a -> Array a) -> (Type -> Type)
  //.
  //. Type constructor for types with one type variable (such as [`Array`][]).
  //.
  //. To define a unary type `t a` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - a predicate which accepts any JavaScript value and returns `true`
  //.     if (and only if) the value is a member of `t x` for some type `x`;
  //.
  //.   - a function which takes any value of type `t a` and returns an array
  //.     of the values of type `a` contained in the `t` (exposed as
  //.     `t.types.$1.extractor`); and
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`).
  //.
  //. For example:
  //.
  //. ```javascript
  //. const type = require('sanctuary-type-identifiers');
  //.
  //. //    maybeTypeIdent :: String
  //. const maybeTypeIdent = 'my-package/Maybe';
  //.
  //. //    Maybe :: Type -> Type
  //. const Maybe = $.UnaryType(
  //.   maybeTypeIdent,
  //.   'http://example.com/my-package#Maybe',
  //.   x => type(x) === maybeTypeIdent,
  //.   maybe => maybe.isJust ? [maybe.value] : []
  //. );
  //.
  //. //    MaybeTypeRep :: TypeRep Maybe
  //. const MaybeTypeRep = {'@@type': maybeTypeIdent};
  //.
  //. //    Nothing :: Maybe a
  //. const Nothing = {
  //.   constructor: MaybeTypeRep,
  //.   isJust: false,
  //.   isNothing: true,
  //.   toString: () => 'Nothing',
  //. };
  //.
  //. //    Just :: a -> Maybe a
  //. const Just = x => ({
  //.   constructor: MaybeTypeRep,
  //.   isJust: true,
  //.   isNothing: false,
  //.   toString: () => 'Just(' + Z.toString(x) + ')',
  //.   value: x,
  //. });
  //.
  //. //    fromMaybe :: a -> Maybe a -> a
  //. const fromMaybe =
  //. def('fromMaybe', {}, [a, Maybe(a), a], (x, m) => m.isJust ? m.value : x);
  //.
  //. fromMaybe(0, Just(42));
  //. // => 42
  //.
  //. fromMaybe(0, Nothing);
  //. // => 0
  //.
  //. fromMaybe(0, Just('XXX'));
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   fromMaybe :: a -> Maybe a -> a
  //. //                ^          ^
  //. //                1          2
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   2)  "XXX" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  function UnaryType(name, url, test, _1) {
    return function($1) {
      function format(outer, inner) {
        return outer('(' + stripNamespace(name) + ' ') +
               inner('$1')(String($1)) + outer(')');
      }
      var types = {$1: {extractor: _1, type: $1}};
      return new _Type(UNARY, name, url, format, test, ['$1'], types);
    };
  }

  var CheckedUnaryType =
  def('UnaryType',
      {},
      [String_,
       String_,
       Function_([Any, Boolean_]),
       Function_([Unchecked('t a'), Array_(Unchecked('a'))]),
       AnyFunction],
      function(name, url, test, _1) {
        return def(stripNamespace(name),
                   {},
                   [Type, Type],
                   UnaryType(name, url, test, _1));
      });

  //  fromUnaryType :: Type -> (Type -> Type)
  function fromUnaryType(t) {
    return UnaryType(t.name, t.url, t._test, t.types.$1.extractor);
  }

  //# BinaryType :: String -> String -> (Any -> Boolean) -> (t a b -> Array a) -> (t a b -> Array b) -> (Type -> Type -> Type)
  //.
  //. Type constructor for types with two type variables (such as [`Pair`][]).
  //.
  //. To define a binary type `t a b` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - a predicate which accepts any JavaScript value and returns `true`
  //.     if (and only if) the value is a member of `t x y` for some types
  //.     `x` and `y`;
  //.
  //.   - a function which takes any value of type `t a b` and returns an array
  //.     of the values of type `a` contained in the `t` (exposed as
  //.     `t.types.$1.extractor`);
  //.
  //.   - a function which takes any value of type `t a b` and returns an array
  //.     of the values of type `b` contained in the `t` (exposed as
  //.     `t.types.$2.extractor`);
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`); and
  //.
  //.   - the type of `b` (exposed as `t.types.$2.type`).
  //.
  //. For example:
  //.
  //. ```javascript
  //. const type = require('sanctuary-type-identifiers');
  //.
  //. //    pairTypeIdent :: String
  //. const pairTypeIdent = 'my-package/Pair';
  //.
  //. //    $Pair :: Type -> Type -> Type
  //. const $Pair = $.BinaryType(
  //.   pairTypeIdent,
  //.   'http://example.com/my-package#Pair',
  //.   x => type(x) === pairTypeIdent,
  //.   pair => [pair[0]],
  //.   pair => [pair[1]]
  //. );
  //.
  //. //    PairTypeRep :: TypeRep Pair
  //. const PairTypeRep = {'@@type': pairTypeIdent};
  //.
  //. //    Pair :: a -> b -> Pair a b
  //. const Pair = def('Pair', {}, [a, b, $Pair(a, b)], (x, y) => ({
  //.   '0': x,
  //.   '1': y,
  //.   constructor: PairTypeRep,
  //.   length: 2,
  //.   toString: () => 'Pair(' + Z.toString(x) + ', ' + Z.toString(y) + ')',
  //. }));
  //.
  //. //    Rank :: Type
  //. const Rank = $.NullaryType(
  //.   'my-package/Rank',
  //.   'http://example.com/my-package#Rank',
  //.   x => typeof x === 'string' && /^([A23456789JQK]|10)$/.test(x)
  //. );
  //.
  //. //    Suit :: Type
  //. const Suit = $.NullaryType(
  //.   'my-package/Suit',
  //.   'http://example.com/my-package#Suit',
  //.   x => typeof x === 'string' && /^[\u2660\u2663\u2665\u2666]$/.test(x)
  //. );
  //.
  //. //    Card :: Type
  //. const Card = $Pair(Rank, Suit);
  //.
  //. //    showCard :: Card -> String
  //. const showCard =
  //. def('showCard', {}, [Card, $.String], card => card[0] + card[1]);
  //.
  //. showCard(Pair('A', '♠'));
  //. // => 'A♠'
  //.
  //. showCard(Pair('X', '♠'));
  //. // ! TypeError: Invalid value
  //. //
  //. //   showCard :: Pair Rank Suit -> String
  //. //                    ^^^^
  //. //                     1
  //. //
  //. //   1)  "X" :: String
  //. //
  //. //   The value at position 1 is not a member of ‘Rank’.
  //. ```
  function BinaryType(name, url, test, _1, _2) {
    return function($1, $2) {
      function format(outer, inner) {
        return outer('(' + stripNamespace(name) + ' ') +
               inner('$1')(String($1)) + outer(' ') +
               inner('$2')(String($2)) + outer(')');
      }
      var types = {$1: {extractor: _1, type: $1},
                   $2: {extractor: _2, type: $2}};
      return new _Type(BINARY, name, url, format, test, ['$1', '$2'], types);
    };
  }

  var CheckedBinaryType =
  def('BinaryType',
      {},
      [String_,
       String_,
       Function_([Any, Boolean_]),
       Function_([Unchecked('t a b'), Array_(Unchecked('a'))]),
       Function_([Unchecked('t a b'), Array_(Unchecked('b'))]),
       AnyFunction],
      function(name, url, test, _1, _2) {
        return def(stripNamespace(name),
                   {},
                   [Type, Type, Type],
                   BinaryType(name, url, test, _1, _2));
      });

  //  xprod :: (Type, Array Type, Array Type) -> Array Type
  function xprod(t, $1s, $2s) {
    var specialize = BinaryType(t.name,
                                t.url,
                                t._test,
                                t.types.$1.extractor,
                                t.types.$2.extractor);
    var $types = [];
    $1s.forEach(function($1) {
      $2s.forEach(function($2) {
        $types.push(specialize($1, $2));
      });
    });
    return $types;
  }

  //# EnumType :: String -> String -> Array Any -> Type
  //.
  //. Type constructor for [enumerated types][] (such as [`RegexFlags`][]).
  //.
  //. To define an enumerated type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`); and
  //.
  //.   - an array of distinct values.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Denomination :: Type
  //. const Denomination = $.EnumType(
  //.   'my-package/Denomination',
  //.   'http://example.com/my-package#Denomination',
  //.   [10, 20, 50, 100, 200]
  //. );
  //. ```
  function EnumType(name, url, members) {
    return NullaryType(name, url, memberOf(members));
  }

  var CheckedEnumType =
  def('EnumType', {}, [String_, String_, Array_(Any), Type], EnumType);

  //# RecordType :: StrMap Type -> Type
  //.
  //. `RecordType` is used to construct record types. The type definition
  //. specifies the name and type of each required field.
  //.
  //. To define a record type one must provide:
  //.
  //.   - an object mapping field name to type.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Point :: Type
  //. const Point = $.RecordType({x: $.FiniteNumber, y: $.FiniteNumber});
  //.
  //. //    dist :: Point -> Point -> FiniteNumber
  //. const dist =
  //. def('dist', {}, [Point, Point, $.FiniteNumber],
  //.     (p, q) => Math.sqrt(Math.pow(p.x - q.x, 2) +
  //.                         Math.pow(p.y - q.y, 2)));
  //.
  //. dist({x: 0, y: 0}, {x: 3, y: 4});
  //. // => 5
  //.
  //. dist({x: 0, y: 0}, {x: 3, y: 4, color: 'red'});
  //. // => 5
  //.
  //. dist({x: 0, y: 0}, {x: NaN, y: NaN});
  //. // ! TypeError: Invalid value
  //. //
  //. //   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
  //. //                                                              ^^^^^^^^^^^^
  //. //                                                                   1
  //. //
  //. //   1)  NaN :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘FiniteNumber’.
  //.
  //. dist(0);
  //. // ! TypeError: Invalid value
  //. //
  //. //   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
  //. //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //. //                              1
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘{ x :: FiniteNumber, y :: FiniteNumber }’.
  //. ```
  function RecordType(fields) {
    var keys = Object.keys(fields).sort();

    function format(outer, inner) {
      return wrap(outer('{'))(outer(' }'))(Z.map(function(k) {
        var t = fields[k];
        return outer(' ' + k + ' :: ') +
               unless(t.type === RECORD || isEmpty(t.keys),
                      stripOutermostParens,
                      inner(k)(String(t)));
      }, keys).join(outer(',')));
    }

    function test(x) {
      return x != null &&
             keys.every(function(k) { return hasOwnProperty.call(x, k); });
    }

    var $types = {};
    keys.forEach(function(k) {
      $types[k] = {extractor: function(x) { return [x[k]]; }, type: fields[k]};
    });

    return new _Type(RECORD, '', '', format, test, keys, $types);
  }

  var CheckedRecordType =
  def('RecordType', {}, [StrMap(Type), Type], RecordType);

  //# TypeVariable :: String -> Type
  //.
  //. Polymorphism is powerful. Not being able to define a function for
  //. all types would be very limiting indeed: one couldn't even define the
  //. identity function!
  //.
  //. Before defining a polymorphic function one must define one or more type
  //. variables:
  //.
  //. ```javascript
  //. const a = $.TypeVariable('a');
  //. const b = $.TypeVariable('b');
  //.
  //. //    id :: a -> a
  //. const id = def('id', {}, [a, a], x => x);
  //.
  //. id(42);
  //. // => 42
  //.
  //. id(null);
  //. // => null
  //. ```
  //.
  //. The same type variable may be used in multiple positions, creating a
  //. constraint:
  //.
  //. ```javascript
  //. //    cmp :: a -> a -> Number
  //. const cmp =
  //. def('cmp', {}, [a, a, $.Number], (x, y) => x < y ? -1 : x > y ? 1 : 0);
  //.
  //. cmp(42, 42);
  //. // => 0
  //.
  //. cmp('a', 'z');
  //. // => -1
  //.
  //. cmp('z', 'a');
  //. // => 1
  //.
  //. cmp(0, '1');
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   cmp :: a -> a -> Number
  //. //          ^    ^
  //. //          1    2
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   2)  "1" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  function TypeVariable(name) {
    return new _Type(VARIABLE, name, '', always2(name), K(true), [], {});
  }

  var CheckedTypeVariable =
  def('TypeVariable', {}, [String_, Type], TypeVariable);

  //# UnaryTypeVariable :: String -> (Type -> Type)
  //.
  //. Combines [`UnaryType`][] and [`TypeVariable`][].
  //.
  //. To define a unary type variable `t a` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`); and
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`).
  //.
  //. Consider the type of a generalized `map`:
  //.
  //. ```haskell
  //. map :: Functor f => (a -> b) -> f a -> f b
  //. ```
  //.
  //. `f` is a unary type variable. With two (nullary) type variables, one
  //. unary type variable, and one [type class][] it's possible to define a
  //. fully polymorphic `map` function:
  //.
  //. ```javascript
  //. const $ = require('sanctuary-def');
  //. const Z = require('sanctuary-type-classes');
  //.
  //. const a = $.TypeVariable('a');
  //. const b = $.TypeVariable('b');
  //. const f = $.UnaryTypeVariable('f');
  //.
  //. //    map :: Functor f => (a -> b) -> f a -> f b
  //. const map =
  //. def('map',
  //.     {f: [Z.Functor]},
  //.     [$.Function([a, b]), f(a), f(b)],
  //.     Z.map);
  //. ```
  //.
  //. Whereas a regular type variable is fully resolved (`a` might become
  //. `Array (Array String)`, for example), a unary type variable defers to
  //. its type argument, which may itself be a type variable. The type argument
  //. corresponds to the type argument of a unary type or the *second* type
  //. argument of a binary type. The second type argument of `Map k v`, for
  //. example, is `v`. One could replace `Functor => f` with `Map k` or with
  //. `Map Integer`, but not with `Map`.
  //.
  //. This shallow inspection makes it possible to constrain a value's "outer"
  //. and "inner" types independently.
  function UnaryTypeVariable(name) {
    return function($1) {
      function format(outer, inner) {
        return outer('(' + name + ' ') + inner('$1')(String($1)) + outer(')');
      }
      var types = {$1: {extractor: K([]), type: $1}};
      return new _Type(VARIABLE, name, '', format, K(true), ['$1'], types);
    };
  }

  var CheckedUnaryTypeVariable =
  def('UnaryTypeVariable',
      {},
      [String_, AnyFunction],
      function(name) {
        return def(name, {}, [Type, Type], UnaryTypeVariable(name));
      });

  //# BinaryTypeVariable :: String -> (Type -> Type -> Type)
  //.
  //. Combines [`BinaryType`][] and [`TypeVariable`][].
  //.
  //. To define a binary type variable `t a b` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`);
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`); and
  //.
  //.   - the type of `b` (exposed as `t.types.$2.type`).
  //.
  //. The more detailed explanation of [`UnaryTypeVariable`][] also applies to
  //. `BinaryTypeVariable`.
  function BinaryTypeVariable(name) {
    return function($1, $2) {
      function format(outer, inner) {
        return outer('(' + name + ' ') + inner('$1')(String($1)) + outer(' ') +
                                         inner('$2')(String($2)) + outer(')');
      }
      var keys = ['$1', '$2'];
      var types = {$1: {extractor: K([]), type: $1},
                   $2: {extractor: K([]), type: $2}};
      return new _Type(VARIABLE, name, '', format, K(true), keys, types);
    };
  }

  var CheckedBinaryTypeVariable =
  def('BinaryTypeVariable',
      {},
      [String_, AnyFunction],
      function(name) {
        return def(name, {}, [Type, Type, Type], BinaryTypeVariable(name));
      });

  //# Thunk :: Type -> Type
  //.
  //. `$.Thunk(T)` is shorthand for `$.Function([T])`, the type comprising
  //. every nullary function (thunk) which returns a value of type `T`.
  var Thunk =
  def('Thunk',
      {},
      [Type, Type],
      function(t) { return Function_([t]); });

  //# Predicate :: Type -> Type
  //.
  //. `$.Predicate(T)` is shorthand for `$.Function([T, $.Boolean])`, the type
  //. comprising every predicate function which takes a value of type `T`.
  var Predicate =
  def('Predicate',
      {},
      [Type, Type],
      function(t) { return Function_([t, Boolean_]); });

  //. ### Type classes
  //.
  //. `concatS`, defined earlier, is a function which concatenates two strings.
  //. This is overly restrictive, since other types support concatenation
  //. (Array, for example).
  //.
  //. One could use a type variable to define a polymorphic "concat" function:
  //.
  //. ```javascript
  //. //    _concat :: a -> a -> a
  //. const _concat =
  //. def('_concat', {}, [a, a, a], (x, y) => x.concat(y));
  //.
  //. _concat('fizz', 'buzz');
  //. // => 'fizzbuzz'
  //.
  //. _concat([1, 2], [3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. _concat([1, 2], 'buzz');
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   _concat :: a -> a -> a
  //. //              ^    ^
  //. //              1    2
  //. //
  //. //   1)  [1, 2] :: Array Number
  //. //
  //. //   2)  "buzz" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  //.
  //. The type of `_concat` is misleading: it suggests that it can operate on
  //. any two values of *any* one type. In fact there's an implicit constraint,
  //. since the type must support concatenation (in [mathematical][semigroup]
  //. terms, the type must have a [semigroup][FL:Semigroup]). The run-time type
  //. errors that result when this constraint is violated are not particularly
  //. descriptive:
  //.
  //. ```javascript
  //. _concat({}, {});
  //. // ! TypeError: undefined is not a function
  //.
  //. _concat(null, null);
  //. // ! TypeError: Cannot read property 'concat' of null
  //. ```
  //.
  //. The solution is to constrain `a` by first defining a [`TypeClass`][]
  //. value, then specifying the constraint in the definition of the "concat"
  //. function:
  //.
  //. ```javascript
  //. const Z = require('sanctuary-type-classes');
  //.
  //. //    Semigroup :: TypeClass
  //. const Semigroup = Z.TypeClass(
  //.   'my-package/Semigroup',
  //.   'http://example.com/my-package#Semigroup',
  //.   [],
  //.   x => x != null && typeof x.concat === 'function'
  //. );
  //.
  //. //    concat :: Semigroup a => a -> a -> a
  //. const concat =
  //. def('concat', {a: [Semigroup]}, [a, a, a], (x, y) => x.concat(y));
  //.
  //. concat([1, 2], [3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. concat({}, {});
  //. // ! TypeError: Type-class constraint violation
  //. //
  //. //   concat :: Semigroup a => a -> a -> a
  //. //             ^^^^^^^^^^^    ^
  //. //                            1
  //. //
  //. //   1)  {} :: Object, StrMap ???
  //. //
  //. //   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
  //. //
  //. //   See http://example.com/my-package#Semigroup for information about the my-package/Semigroup type class.
  //.
  //. concat(null, null);
  //. // ! TypeError: Type-class constraint violation
  //. //
  //. //   concat :: Semigroup a => a -> a -> a
  //. //             ^^^^^^^^^^^    ^
  //. //                            1
  //. //
  //. //   1)  null :: Null
  //. //
  //. //   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
  //. //
  //. //   See http://example.com/my-package#Semigroup for information about the my-package/Semigroup type class.
  //. ```
  //.
  //. Multiple constraints may be placed on a type variable by including
  //. multiple `TypeClass` values in the array (e.g. `{a: [Foo, Bar, Baz]}`).

  //  checkValue :: ... -> Undefined
  function checkValue(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    index,              // :: Integer
    propPath,           // :: PropPath
    t,                  // :: Type
    value               // :: Any
  ) {
    if (t.type === VARIABLE) {
      $typeVarMapBox[0] =
        updateTypeVarMap(env, $typeVarMapBox[0], t, index, propPath, [value]);
      if (isEmpty($typeVarMapBox[0][t.name].types)) {
        throw typeVarConstraintViolation(
          env,
          typeInfo,
          index,
          propPath,
          $typeVarMapBox[0][t.name].valuesByPath
        );
      }
    } else if (!test(env, t, value)) {
      throw invalidValue(env, typeInfo, index, propPath, value);
    }
  }

  //  wrapFunction :: ... -> Function
  function wrapFunction(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    index,              // :: Integer
    f                   // :: Function
  ) {
    var expType = typeInfo.types[index];
    var numArgsExpected = expType.keys.length - 1;
    return arity(numArgsExpected, function() {
      var args = slice.call(arguments);
      if (args.length !== numArgsExpected) {
        throw invalidArgumentsLength(typeInfo, index, numArgsExpected, args);
      }
      function checkValue$(propPath, t, x) {
        checkValue(env, typeInfo, $typeVarMapBox, index, propPath, t, x);
      }
      init(expType.keys).forEach(function(k, idx) {
        checkValue$([k], expType.types[k].type, args[idx]);
      });

      var output = f.apply(this, arguments);
      var k = last(expType.keys);
      checkValue$([k], expType.types[k].type, output);
      return output;
    });
  }

  //  wrapFunctionCond ::
  //    Array Type -> TypeInfo -> Box TypeVarMap -> Integer -> a -> a
  function wrapFunctionCond(env, typeInfo, $typeVarMapBox, index, value) {
    return typeInfo.types[index].type === FUNCTION ?
      wrapFunction(env, typeInfo, $typeVarMapBox, index, value) :
      value;
  }

  //  wrapFunctions :: ... -> Array Any
  function wrapFunctions(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    values              // :: Array Any
  ) {
    return values.map(function(value, idx) {
      return wrapFunctionCond(env, typeInfo, $typeVarMapBox, idx, value);
    });
  }

  //  tooManyArguments :: (TypeInfo, Integer) -> Error
  //
  //  This function is used in `curry` when a function defined via `def`
  //  is applied to too many arguments.
  function tooManyArguments(typeInfo, numArgsReceived) {
    var numArgsExpected = typeInfo.types.length - 1;
    return new TypeError(trimTrailingSpaces(
      'Function applied to too many arguments\n\n' +
      typeSignature(typeInfo) + '\n\n' +
      q(typeInfo.name) + ' expected' +
      (numArgsExpected > 0 ? ' at most ' : ' ') + numArgs(numArgsExpected) +
      ' but received ' + numArgs(numArgsReceived) + '.\n'
    ));
  }

  //  constraintsRepr :: ... -> String
  function constraintsRepr(
    constraints,    // :: StrMap (Array TypeClass)
    outer,          // :: String -> String
    inner           // :: String -> TypeClass -> String -> String
  ) {
    var $reprs = [];
    Object.keys(constraints).sort().forEach(function(k) {
      var f = inner(k);
      constraints[k].forEach(function(typeClass) {
        $reprs.push(f(typeClass)(stripNamespace(typeClass.name) + ' ' + k));
      });
    });
    return when($reprs.length > 0,
                function(s) { return s + outer(' => '); },
                when($reprs.length > 1,
                     wrap(outer('('))(outer(')')),
                     $reprs.join(outer(', '))));
  }

  //  label :: String -> String -> String
  function label(label) {
    return function(s) {
      var delta = s.length - label.length;
      return strRepeat(' ', Math.floor(delta / 2)) + label +
             strRepeat(' ', Math.ceil(delta / 2));
    };
  }

  //  typeVarNames :: Type -> Array String
  function typeVarNames(t) {
    return Z.concat(
      t.type === VARIABLE ? [t.name] : [],
      Z.chain(function(k) { return typeVarNames(t.types[k].type); }, t.keys)
    );
  }

  //  showTypeWith :: TypeInfo -> Type -> String
  function showTypeWith(typeInfo) {
    var names = Z.chain(typeVarNames, typeInfo.types);
    return function(t) {
      var code = 'a'.charCodeAt(0);
      return unless(
        t.type === FUNCTION || t.type === RECORD || isEmpty(t.keys),
        stripOutermostParens,
        String(t).replace(/\bUnknown\b/g, function() {
          // eslint-disable-next-line no-plusplus
          do var name = String.fromCharCode(code++);
          while (names.indexOf(name) >= 0);
          return name;
        })
      );
    };
  }

  //  showTypeQuoted :: Type -> String
  function showTypeQuoted(t) {
    return q(unless(t.type === RECORD || isEmpty(t.keys),
                    stripOutermostParens,
                    String(t)));
  }

  //  showValuesAndTypes :: ... -> String
  function showValuesAndTypes(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    values,         // :: Array Any
    pos             // :: Integer
  ) {
    var showType = showTypeWith(typeInfo);
    return String(pos) + ')  ' + Z.map(function(x) {
      var types = determineActualTypesLoose(env, [x]);
      return Z.toString(x) + ' :: ' + Z.map(showType, types).join(', ');
    }, values).join('\n    ');
  }

  //  typeSignature :: TypeInfo -> String
  function typeSignature(typeInfo) {
    var reprs = Z.map(showTypeWith(typeInfo), typeInfo.types);
    var arity = reprs.length - 1;
    return typeInfo.name + ' :: ' +
             constraintsRepr(typeInfo.constraints, id, K(K(id))) +
             when(arity === 0, parenthesize, init(reprs).join(' -> ')) +
             ' -> ' + last(reprs);
  }

  //  _underline :: ... -> String
  function _underline(
    t,              // :: Type
    propPath,       // :: PropPath
    formatType3     // :: Type -> Array String -> String -> String
  ) {
    return unless(t.type === RECORD ||
                    isEmpty(t.keys) ||
                    t.type === FUNCTION && isEmpty(propPath) ||
                    !isEmpty(propPath),
                  stripOutermostParens,
                  formatType3(t)(propPath)(t.format(_, function(k) {
                    return K(_underline(t.types[k].type,
                                        Z.concat(propPath, [k]),
                                        formatType3));
                  })));
  }

  //  underline :: ... -> String
  function underline(
    typeInfo,               // :: TypeInfo
    underlineConstraint,    // :: String -> TypeClass -> String -> String
    formatType5
    // :: Integer -> (String -> String) -> Type -> PropPath -> String -> String
  ) {
    var st = typeInfo.types.reduce(function(st, t, index) {
      var formatType4 = formatType5(index);
      var counter = st.counter;
      function replace(s) { return label(String(counter += 1))(s); }
      return {
        carets: Z.concat(st.carets, [_underline(t, [], formatType4(r('^')))]),
        numbers: Z.concat(st.numbers,
                          [_underline(t, [], formatType4(replace))]),
        counter: counter
      };
    }, {carets: [], numbers: [], counter: 0});

    return typeSignature(typeInfo) + '\n' +
           _(typeInfo.name + ' :: ') +
             constraintsRepr(typeInfo.constraints, _, underlineConstraint) +
             st.carets.join(_(' -> ')) + '\n' +
           _(typeInfo.name + ' :: ') +
             constraintsRepr(typeInfo.constraints, _, K(K(_))) +
             st.numbers.join(_(' -> ')) + '\n';
  }

  //  resolvePropPath :: (Type, Array String) -> Type
  function resolvePropPath(t, propPath) {
    return Z.reduce(function(t, prop) { return t.types[prop].type; },
                    t,
                    propPath);
  }

  //  formatType6 ::
  //    PropPath -> Integer -> (String -> String) ->
  //      Type -> PropPath -> String -> String
  function formatType6(indexedPropPath) {
    return function(index_) {
      return function(f) {
        return function(t) {
          return function(propPath_) {
            var indexedPropPath_ = Z.concat([index_], propPath_);
            var p = isPrefix(indexedPropPath_)(indexedPropPath);
            var q = isPrefix(indexedPropPath)(indexedPropPath_);
            return p && q ? f : p ? id : _;
          };
        };
      };
    };
  }

  //  see :: (String, { name :: String, url :: String? }) -> String
  function see(label, record) {
    return record.url == null || record.url === '' ?
           '' :
           '\nSee ' + record.url +
           ' for information about the ' + record.name + ' ' + label + '.\n';
  }

  //  typeClassConstraintViolation :: ... -> Error
  function typeClassConstraintViolation(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeClass,      // :: TypeClass
    index,          // :: Integer
    propPath,       // :: PropPath
    value,          // :: Any
    typeVarMap      // :: TypeVarMap
  ) {
    var expType = resolvePropPath(typeInfo.types[index], propPath);
    return new TypeError(trimTrailingSpaces(
      'Type-class constraint violation\n\n' +
      underline(typeInfo,
                function(tvn) {
                  return function(tc) {
                    return tvn === expType.name && tc.name === typeClass.name ?
                      r('^') :
                      _;
                  };
                },
                formatType6(Z.concat([index], propPath))) +
      '\n' +
      showValuesAndTypes(env, typeInfo, [value], 1) + '\n\n' +
      q(typeInfo.name) + ' requires ' + q(expType.name) + ' to satisfy the ' +
      stripNamespace(typeClass.name) + ' type-class constraint; ' +
      'the value at position 1 does not.\n' +
      see('type class', typeClass)
    ));
  }

  //  typeVarConstraintViolation :: ... -> Error
  function typeVarConstraintViolation(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    valuesByPath    // :: StrMap (Array Any)
  ) {
    //  If we apply an ‘a -> a -> a -> a’ function to Left('x'), Right(1), and
    //  Right(null) we'd like to avoid underlining the first argument position,
    //  since Left('x') is compatible with the other ‘a’ values.
    var key = JSON.stringify(Z.concat([index], propPath));
    var values = valuesByPath[key];

    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var keys = Object.keys(valuesByPath).sort().filter(function(k) {
      var values_ = valuesByPath[k];
      return (
        //  Keep X, the position at which the violation was observed.
        k === key ||
        //  Keep positions whose values are incompatible with the values at X.
        isEmpty(determineActualTypesStrict(env, Z.concat(values, values_)))
      );
    });

    var underlinedTypeVars =
    underlineTypeVars(typeInfo,
                      Z.reduce(function($valuesByPath, k) {
                        $valuesByPath[k] = valuesByPath[k];
                        return $valuesByPath;
                      }, {}, keys));

    return new TypeError(trimTrailingSpaces(
      values.length === 1 && isEmpty(determineActualTypesLoose(env, values)) ?
        'Unrecognized value\n\n' +
        underlinedTypeVars + '\n' +
        '1)  ' + Z.toString(values[0]) + ' :: (no types)\n\n' +
        toMarkdownList(
          'The environment is empty! ' +
          'Polymorphic functions require a non-empty environment.\n',
          'The value at position 1 is not a member of any type in ' +
          'the environment.\n\n' +
          'The environment contains the following types:\n\n',
          showTypeWith(typeInfo),
          env
        ) :
      // else
        'Type-variable constraint violation\n\n' +
        underlinedTypeVars + '\n' +
        Z.reduce(function(st, k) {
          var values = valuesByPath[k];
          return isEmpty(values) ? st : {
            idx: st.idx + 1,
            s: st.s +
               showValuesAndTypes(env, typeInfo, values, st.idx + 1) +
               '\n\n'
          };
        }, {idx: 0, s: ''}, keys).s +
        'Since there is no type of which all the above values are ' +
        'members, the type-variable constraint has been violated.\n'
    ));
  }

  //  invalidValue :: ... -> Error
  function invalidValue(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    value           // :: Any
  ) {
    var t = resolvePropPath(typeInfo.types[index], propPath);
    return new TypeError(trimTrailingSpaces(
      'Invalid value\n\n' +
      underline(typeInfo,
                K(K(_)),
                formatType6(Z.concat([index], propPath))) +
      '\n' +
      showValuesAndTypes(env, typeInfo, [value], 1) + '\n\n' +
      'The value at position 1 is not a member of ' + showTypeQuoted(t) + '.' +
      '\n' +
      see('type', t)
    ));
  }

  //  invalidArgumentsLength :: ... -> Error
  //
  //  This function is used in `wrapFunction` to ensure that higher-order
  //  functions defined via `def` only ever apply a function argument to
  //  the correct number of arguments.
  function invalidArgumentsLength(
    typeInfo,           // :: TypeInfo
    index,              // :: Integer
    numArgsExpected,    // :: Integer
    args                // :: Array Any
  ) {
    return new TypeError(trimTrailingSpaces(
      q(typeInfo.name) + ' applied ' + showTypeQuoted(typeInfo.types[index]) +
      ' to the wrong number of arguments\n\n' +
      underline(
        typeInfo,
        K(K(_)),
        function(index_) {
          return function(f) {
            return function(t) {
              return function(propPath) {
                return function(s) {
                  return index_ === index ?
                    String(t).replace(
                      /^[(](.*) -> (.*)[)]$/,
                      function(s, $1, $2) {
                        return _('(') + f($1) + _(' -> ' + $2 + ')');
                      }
                    ) :
                    _(s);
                };
              };
            };
          };
        }
      ) + '\n' +
      'Expected ' + numArgs(numArgsExpected) +
      ' but received ' + numArgs(args.length) +
      toMarkdownList('.\n', ':\n\n', Z.toString, args)
    ));
  }

  //  assertRight :: Either (() -> Error) a -> a !
  function assertRight(either) {
    if (either.isLeft) throw either.value();
    return either.value;
  }

  //  curry :: ... -> Function
  function curry(
    opts,         // :: Options
    typeInfo,     // :: TypeInfo
    _typeVarMap,  // :: TypeVarMap
    _values,      // :: Array Any
    _indexes,     // :: Array Integer
    impl          // :: Function
  ) {
    var n = typeInfo.types.length - 1;

    var curried = arity(_indexes.length, function() {
      if (opts.checkTypes) {
        var delta = _indexes.length - arguments.length;
        if (delta < 0) throw tooManyArguments(typeInfo, n - delta);
      }
      var typeVarMap = _typeVarMap;
      var values = _values.slice();
      var indexes = [];
      for (var idx = 0; idx < _indexes.length; idx += 1) {
        var index = _indexes[idx];

        if (idx < arguments.length &&
            !(typeof arguments[idx] === 'object' &&
              arguments[idx] != null &&
              arguments[idx]['@@functional/placeholder'] === true)) {

          var value = arguments[idx];
          if (opts.checkTypes) {
            var result = satisfactoryTypes(opts.env,
                                           typeInfo,
                                           typeVarMap,
                                           typeInfo.types[index],
                                           index,
                                           [],
                                           [value]);
            typeVarMap = assertRight(result).typeVarMap;
          }
          values[index] = value;
        } else {
          indexes.push(index);
        }
      }
      if (isEmpty(indexes)) {
        if (opts.checkTypes) {
          var returnValue = impl.apply(this,
                                       wrapFunctions(opts.env,
                                                     typeInfo,
                                                     [typeVarMap],
                                                     values));
          assertRight(satisfactoryTypes(opts.env,
                                        typeInfo,
                                        typeVarMap,
                                        typeInfo.types[n],
                                        n,
                                        [],
                                        [returnValue]));
          return wrapFunctionCond(env, typeInfo, [typeVarMap], n, returnValue);
        } else {
          return impl.apply(this, values);
        }
      } else {
        return curry(opts, typeInfo, typeVarMap, values, indexes, impl);
      }
    });

    var showType = showTypeWith(typeInfo);
    curried.inspect = curried.toString = function() {
      var vReprs = [];
      var tReprs = [];
      for (var idx = 0, placeholders = 0; idx < n; idx += 1) {
        if (_indexes.indexOf(idx) >= 0) {
          placeholders += 1;
          tReprs.push(showType(typeInfo.types[idx]));
        } else {
          while (placeholders > 0) {
            vReprs.push('__');
            placeholders -= 1;
          }
          vReprs.push(Z.toString(_values[idx]));
        }
      }
      return typeInfo.name +
             when(vReprs.length > 0, parenthesize, vReprs.join(', ')) +
             ' :: ' +
             constraintsRepr(typeInfo.constraints, id, K(K(id))) +
             when(n === 0, parenthesize, tReprs.join(' -> ')) +
             ' -> ' + showType(typeInfo.types[n]);
    };

    return curried;
  }

  function _create(opts) {
    function def(name, constraints, expTypes, impl) {
      var values = new Array(expTypes.length - 1);
      if (values.length > 9) {
        throw new RangeError(q(def.name) + ' cannot define a function ' +
                             'with arity greater than nine');
      }
      return curry(opts,
                   {name: name, constraints: constraints, types: expTypes},
                   {},
                   values,
                   range(0, values.length),
                   impl);
    }
    return def(def.name,
               {},
               [String_,
                StrMap(Array_(TypeClass)),
                NonEmpty(Array_(Type)),
                AnyFunction,
                AnyFunction],
               def);
  }

  var create =
  def('create',
      {},
      [RecordType({checkTypes: Boolean_, env: Array_(Any)}), AnyFunction],
      _create);

  //  fromUncheckedUnaryType :: (Type -> Type) -> (Type -> Type)
  function fromUncheckedUnaryType(typeConstructor) {
    var t = typeConstructor(Unknown);
    var _1 = t.types.$1.extractor;
    return CheckedUnaryType(t.name, t.url, t._test, _1);
  }

  //  fromUncheckedBinaryType :: ((Type, Type) -> Type) ->
  //                             (Type -> Type -> Type)
  function fromUncheckedBinaryType(typeConstructor) {
    var t = typeConstructor(Unknown, Unknown);
    var _1 = t.types.$1.extractor;
    var _2 = t.types.$2.extractor;
    return CheckedBinaryType(t.name, t.url, t._test, _1, _2);
  }

  return {
    __: __,
    Any: Any,
    AnyFunction: AnyFunction,
    Arguments: Arguments,
    Array: fromUncheckedUnaryType(Array_),
    Boolean: Boolean_,
    Date: Date_,
    Error: Error_,
    FiniteNumber: FiniteNumber,
    Function: def('Function', {}, [Array_(Type), Type], Function_),
    GlobalRegExp: GlobalRegExp,
    Integer: Integer,
    NegativeFiniteNumber: NegativeFiniteNumber,
    NegativeInteger: NegativeInteger,
    NegativeNumber: NegativeNumber,
    NonEmpty: NonEmpty,
    NonGlobalRegExp: NonGlobalRegExp,
    NonNegativeInteger: NonNegativeInteger,
    NonZeroFiniteNumber: NonZeroFiniteNumber,
    NonZeroInteger: NonZeroInteger,
    NonZeroValidNumber: NonZeroValidNumber,
    Null: Null,
    Nullable: fromUncheckedUnaryType(Nullable),
    Number: Number_,
    Object: Object_,
    Pair: fromUncheckedBinaryType(Pair),
    PositiveFiniteNumber: PositiveFiniteNumber,
    PositiveInteger: PositiveInteger,
    PositiveNumber: PositiveNumber,
    RegExp: RegExp_,
    RegexFlags: RegexFlags,
    StrMap: fromUncheckedUnaryType(StrMap),
    String: String_,
    Symbol: Symbol_,
    Type: Type,
    TypeClass: TypeClass,
    Undefined: Undefined,
    Unknown: Unknown,
    ValidDate: ValidDate,
    ValidNumber: ValidNumber,
    env: env,
    create: create,
    test: def('test', {}, [Array_(Type), Type, Any, Boolean_], test),
    NullaryType: CheckedNullaryType,
    UnaryType: CheckedUnaryType,
    BinaryType: CheckedBinaryType,
    EnumType: CheckedEnumType,
    RecordType: CheckedRecordType,
    TypeVariable: CheckedTypeVariable,
    UnaryTypeVariable: CheckedUnaryTypeVariable,
    BinaryTypeVariable: CheckedBinaryTypeVariable,
    Thunk: Thunk,
    Predicate: Predicate
  };

}));

//. [FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
//. [Monoid]:               https://github.com/fantasyland/fantasy-land#monoid
//. [Setoid]:               https://github.com/fantasyland/fantasy-land#setoid
//. [`Array`]:              #Array
//. [`BinaryType`]:         #BinaryType
//. [`Date`]:               #Date
//. [`FiniteNumber`]:       #FiniteNumber
//. [`GlobalRegExp`]:       #GlobalRegExp
//. [`Integer`]:            #Integer
//. [`NonGlobalRegExp`]:    #NonGlobalRegExp
//. [`Number`]:             #Number
//. [`Object.create`]:      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
//. [`Pair`]:               #Pair
//. [`RegExp`]:             #RegExp
//. [`RegexFlags`]:         #RegexFlags
//. [`String`]:             #String
//. [`SyntaxError`]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
//. [`TypeClass`]:          https://github.com/sanctuary-js/sanctuary-type-classes#TypeClass
//. [`TypeError`]:          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
//. [`TypeVariable`]:       #TypeVariable
//. [`UnaryType`]:          #UnaryType
//. [`UnaryTypeVariable`]:  #UnaryTypeVariable
//. [`Unknown`]:            #Unknown
//. [`ValidNumber`]:        #ValidNumber
//. [`env`]:                #env
//. [arguments]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
//. [enumerated types]:     https://en.wikipedia.org/wiki/Enumerated_type
//. [max]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
//. [min]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER
//. [record type]:          #RecordType
//. [semigroup]:            https://en.wikipedia.org/wiki/Semigroup
//. [type class]:           #type-classes
//. [type variables]:       #TypeVariable
//. [types]:                #types

},{"sanctuary-type-classes":14,"sanctuary-type-identifiers":15}],12:[function(require,module,exports) {
var define;
/*    #######
   ####     ####
 ####   ###   ####
#####   ###########   sanctuary
########   ########   noun
###########   #####   1 [ mass noun ] refuge from unsafe JavaScript
 ####   ###   ####
   ####     ####
      #######    */

//. # Sanctuary
//.
//. [![npm](https://img.shields.io/npm/v/sanctuary.svg)](https://www.npmjs.com/package/sanctuary)
//. [![CircleCI](https://img.shields.io/circleci/project/github/sanctuary-js/sanctuary/master.svg)](https://circleci.com/gh/sanctuary-js/sanctuary/tree/master)
//. [![Gitter](https://img.shields.io/gitter/room/badges/shields.svg)](https://gitter.im/sanctuary-js/sanctuary)
//.
//. Sanctuary is a JavaScript functional programming library inspired by
//. [Haskell][] and [PureScript][]. It's stricter than [Ramda][], and
//. provides a similar suite of functions.
//.
//. Sanctuary promotes programs composed of simple, pure functions. Such
//. programs are easier to comprehend, test, and maintain &ndash; they are
//. also a pleasure to write.
//.
//. Sanctuary provides two data types, [Maybe][] and [Either][], both of
//. which are compatible with [Fantasy Land][]. Thanks to these data types
//. even Sanctuary functions which may fail, such as [`head`](#head), are
//. composable.
//.
//. Sanctuary makes it possible to write safe code without null checks.
//. In JavaScript it's trivial to introduce a possible run-time type error:
//.
//.     words[0].toUpperCase()
//.
//. If `words` is `[]` we'll get a familiar error at run-time:
//.
//.     TypeError: Cannot read property 'toUpperCase' of undefined
//.
//. Sanctuary gives us a fighting chance of avoiding such errors. We might
//. write:
//.
//.     S.map(S.toUpper, S.head(words))
//.
//. Sanctuary is designed to work in Node.js and in ES5-compatible browsers.
//.
//. ## Types
//.
//. Sanctuary uses Haskell-like type signatures to describe the types of
//. values, including functions. `'foo'`, for example, is a member of `String`;
//. `[1, 2, 3]` is a member of `Array Number`. The double colon (`::`) is used
//. to mean "is a member of", so one could write:
//.
//.     'foo' :: String
//.     [1, 2, 3] :: Array Number
//.
//. An identifier may appear to the left of the double colon:
//.
//.     Math.PI :: Number
//.
//. The arrow (`->`) is used to express a function's type:
//.
//.     Math.abs :: Number -> Number
//.
//. That states that `Math.abs` is a unary function which takes an argument
//. of type `Number` and returns a value of type `Number`.
//.
//. Some functions are parametrically polymorphic: their types are not fixed.
//. Type variables are used in the representations of such functions:
//.
//.     S.I :: a -> a
//.
//. `a` is a type variable. Type variables are not capitalized, so they
//. are differentiable from type identifiers (which are always capitalized).
//. By convention type variables have single-character names. The signature
//. above states that `S.I` takes a value of any type and returns a value of
//. the same type. Some signatures feature multiple type variables:
//.
//.     S.K :: a -> b -> a
//.
//. It must be possible to replace all occurrences of `a` with a concrete type.
//. The same applies for each other type variable. For the function above, the
//. types with which `a` and `b` are replaced may be different, but needn't be.
//.
//. Since all Sanctuary functions are curried (they accept their arguments
//. one at a time), a binary function is represented as a unary function which
//. returns a unary function: `* -> * -> *`. This aligns neatly with Haskell,
//. which uses curried functions exclusively. In JavaScript, though, we may
//. wish to represent the types of functions with arities less than or greater
//. than one. The general form is `(<input-types>) -> <output-type>`, where
//. `<input-types>` comprises zero or more comma–space (<code>, </code>)
//. -separated type representations:
//.
//.   - `() -> String`
//.   - `(a, b) -> a`
//.   - `(a, b, c) -> d`
//.
//. `Number -> Number` can thus be seen as shorthand for `(Number) -> Number`.
//.
//. The question mark (`?`) is used to represent types which include `null`
//. and `undefined` as members. `String?`, for example, represents the type
//. comprising `null`, `undefined`, and all strings.
//.
//. Sanctuary embraces types. JavaScript doesn't support algebraic data types,
//. but these can be simulated by providing a group of data constructors which
//. return values with the same set of methods. A value of the Either type, for
//. example, is created via the Left constructor or the Right constructor.
//.
//. It's necessary to extend Haskell's notation to describe implicit arguments
//. to the *methods* provided by Sanctuary's types. In `x.map(y)`, for example,
//. the `map` method takes an implicit argument `x` in addition to the explicit
//. argument `y`. The type of the value upon which a method is invoked appears
//. at the beginning of the signature, separated from the arguments and return
//. value by a squiggly arrow (`~>`). The type of the `fantasy-land/map` method
//. of the Maybe type is written `Maybe a ~> (a -> b) -> Maybe b`. One could
//. read this as:
//.
//. _When the `fantasy-land/map` method is invoked on a value of type `Maybe a`
//. (for any type `a`) with an argument of type `a -> b` (for any type `b`),
//. it returns a value of type `Maybe b`._
//.
//. The squiggly arrow is also used when representing non-function properties.
//. `Maybe a ~> Boolean`, for example, represents a Boolean property of a value
//. of type `Maybe a`.
//.
//. Sanctuary supports type classes: constraints on type variables. Whereas
//. `a -> a` implicitly supports every type, `Functor f => (a -> b) -> f a ->
//. f b` requires that `f` be a type which satisfies the requirements of the
//. Functor type class. Type-class constraints appear at the beginning of a
//. type signature, separated from the rest of the signature by a fat arrow
//. (`=>`).
//.
//. ### Type representatives
//.
//. What is the type of `Number`? One answer is `a -> Number`, since it's a
//. function which takes an argument of any type and returns a Number value.
//. When provided as the first argument to [`is`](#is), though, `Number` is
//. really the value-level representative of the Number type.
//.
//. Sanctuary uses the TypeRep pseudotype to describe type representatives.
//. For example:
//.
//.     Number :: TypeRep Number
//.
//. `Number` is the sole inhabitant of the TypeRep Number type.
//.
//. ## Type checking
//.
//. Sanctuary functions are defined via [sanctuary-def][] to provide run-time
//. type checking. This is tremendously useful during development: type errors
//. are reported immediately, avoiding circuitous stack traces (at best) and
//. silent failures due to type coercion (at worst). For example:
//.
//. ```javascript
//. S.add(2, true);
//. // ! TypeError: Invalid value
//. //
//. //   add :: FiniteNumber -> FiniteNumber -> FiniteNumber
//. //                          ^^^^^^^^^^^^
//. //                               1
//. //
//. //   1)  true :: Boolean
//. //
//. //   The value at position 1 is not a member of ‘FiniteNumber’.
//. //
//. //   See v:sanctuary-js/sanctuary-def#FiniteNumber for information about the sanctuary-def/FiniteNumber type.
//. ```
//.
//. Compare this to the behaviour of Ramda's unchecked equivalent:
//.
//. ```javascript
//. R.add(2, true);
//. // => 3
//. ```
//.
//. There is a performance cost to run-time type checking. One may wish to
//. disable type checking in certain contexts to avoid paying this cost.
//. [`create`](#create) facilitates the creation of a Sanctuary module which
//. does not perform type checking.
//.
//. In Node, one could use an environment variable to determine whether to
//. perform type checking:
//.
//. ```javascript
//. const {create, env} = require('sanctuary');
//.
//. const checkTypes = process.env.NODE_ENV !== 'production';
//. const S = create({checkTypes, env});
//. ```
//.
//. ## API

(function(f) {

  'use strict';

  /* istanbul ignore else */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f(require('sanctuary-def'),
                       require('sanctuary-type-classes'),
                       require('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define(['sanctuary-def',
            'sanctuary-type-classes',
            'sanctuary-type-identifiers'],
           f);
  } else {
    self.sanctuary = f(self.sanctuaryDef,
                       self.sanctuaryTypeClasses,
                       self.sanctuaryTypeIdentifiers);
  }

}(function($, Z, type) {

  'use strict';

  //  Fn :: (Type, Type) -> Type
  function Fn(x, y) { return $.Function([x, y]); }

  //  flip$ :: ((a, b) -> c) -> b -> a -> c
  function flip$(f) {
    return function(x) {
      return function(y) {
        return f(y, x);
      };
    };
  }

  //  toObject :: a -> Object
  function toObject(x) {
    return x == null ? Object.create(null) : Object(x);
  }

  //  typeEq :: String -> a -> Boolean
  function typeEq(typeIdent) {
    return function(x) {
      return type(x) === typeIdent;
    };
  }

  //  uncurry2 :: (a -> b -> c) -> ((a, b) -> c)
  function uncurry2(f) {
    return function(x, y) {
      return f(x)(y);
    };
  }

  //  readmeUrl :: String -> String
  function readmeUrl(id) {
    var version = '0.14.1';  // updated programmatically
    return 'https://github.com/sanctuary-js/sanctuary/tree/v' + version +
           '#' + id;
  }

  //  :: Type
  var a = $.TypeVariable('a');
  var b = $.TypeVariable('b');
  var c = $.TypeVariable('c');
  var d = $.TypeVariable('d');
  var e = $.TypeVariable('e');
  var g = $.TypeVariable('g');
  var l = $.TypeVariable('l');
  var r = $.TypeVariable('r');

  //  :: Type -> Type
  var f = $.UnaryTypeVariable('f');
  var m = $.UnaryTypeVariable('m');
  var t = $.UnaryTypeVariable('t');
  var w = $.UnaryTypeVariable('w');

  //  :: Type -> Type -> Type
  var p = $.BinaryTypeVariable('p');
  var s = $.BinaryTypeVariable('s');

  //  eitherTypeIdent :: String
  var eitherTypeIdent = 'sanctuary/Either';

  //  $Either :: Type -> Type -> Type
  var $Either = $.BinaryType(
    eitherTypeIdent,
    readmeUrl('EitherType'),
    typeEq(eitherTypeIdent),
    function(either) { return either.isLeft ? [either.value] : []; },
    function(either) { return either.isRight ? [either.value] : []; }
  );

  //  List :: Type -> Type
  var List = $.UnaryType(
    'sanctuary/List',
    readmeUrl('list'),
    function(x) { return $.String._test(x) || Array.isArray(x); },
    function(list) { return $.String._test(list) ? [] : list; }
  );

  //  maybeTypeIdent :: String
  var maybeTypeIdent = 'sanctuary/Maybe';

  //  $Maybe :: Type -> Type
  var $Maybe = $.UnaryType(
    maybeTypeIdent,
    readmeUrl('MaybeType'),
    typeEq(maybeTypeIdent),
    function(maybe) { return maybe.isJust ? [maybe.value] : []; }
  );

  //  TypeRep :: Type -> Type
  var TypeRep = $.UnaryType(
    'sanctuary/TypeRep',
    readmeUrl('type-representatives'),
    function(x) {
      return $.AnyFunction._test(x) ||
             x != null && $.String._test(x['@@type']);
    },
    function(typeRep) { return []; }
  );

  //  defaultEnv :: Array Type
  var defaultEnv = Z.concat($.env, [
    $.FiniteNumber,
    $.NonZeroFiniteNumber,
    $Either($.Unknown, $.Unknown),
    Fn($.Unknown, $.Unknown),
    $.GlobalRegExp,
    $.NonGlobalRegExp,
    $.Integer,
    $.NonNegativeInteger,
    $Maybe($.Unknown),
    $.Pair($.Unknown, $.Unknown),
    $.RegexFlags,
    $.ValidDate,
    $.ValidNumber
  ]);

  //  Options :: Type
  var Options = $.RecordType({checkTypes: $.Boolean, env: $.Array($.Any)});

  //  createSanctuary :: Options -> Module
  function createSanctuary(opts) {

  /* eslint-disable indent */

  //  checkTypes :: Boolean
  var checkTypes = opts.checkTypes;

  //  env :: Array Type
  var env = opts.env;

  var S = {};

  //# create :: { checkTypes :: Boolean, env :: Array Type } -> Module
  //.
  //. Takes an options record and returns a Sanctuary module. `checkTypes`
  //. specifies whether to enable type checking. The module's polymorphic
  //. functions (such as [`I`](#I)) require each value associated with a
  //. type variable to be a member of at least one type in the environment.
  //.
  //. A well-typed application of a Sanctuary function will produce the same
  //. result regardless of whether type checking is enabled. If type checking
  //. is enabled, a badly typed application will produce an exception with a
  //. descriptive error message.
  //.
  //. The following snippet demonstrates defining a custom type and using
  //. `create` to produce a Sanctuary module which is aware of that type:
  //.
  //. ```javascript
  //. const {create, env} = require('sanctuary');
  //. const $ = require('sanctuary-def');
  //. const type = require('sanctuary-type-identifiers');
  //.
  //. //    Identity :: a -> Identity a
  //. const Identity = function Identity(x) {
  //.   if (!(this instanceof Identity)) return new Identity(x);
  //.   this.value = x;
  //. };
  //.
  //. Identity['@@type'] = 'my-package/Identity@1';
  //.
  //. Identity.prototype['fantasy-land/map'] = function(f) {
  //.   return Identity(f(this.value));
  //. };
  //.
  //. //    IdentityType :: Type -> Type
  //. const IdentityType = $.UnaryType(
  //.   Identity['@@type'],
  //.   'http://example.com/my-package#Identity',
  //.   x => type(x) === Identity['@@type'],
  //.   identity => [identity.value]
  //. );
  //.
  //. const S = create({
  //.   checkTypes: process.env.NODE_ENV !== 'production',
  //.   env: env.concat([IdentityType($.Unknown)]),
  //. });
  //.
  //. S.map(S.sub(1), Identity(43));
  //. // => Identity(42)
  //. ```
  //.
  //. See also [`env`](#env).
  S.create =
  $.create({checkTypes: checkTypes, env: defaultEnv})('create',
                                                      {},
                                                      [Options, $.Object],
                                                      createSanctuary);

  //# env :: Array Type
  //.
  //. The default environment, which may be used as is or as the basis of a
  //. custom environment in conjunction with [`create`](#create).
  S.env = defaultEnv;

  /* istanbul ignore if */
  if (typeof __doctest !== 'undefined') {
    /* global __doctest:false */
    /* eslint-disable no-unused-vars */
    var _List = __doctest.require('./test/internal/List');
    var Cons = _List.Cons;
    var Nil = _List.Nil;
    var Sum = __doctest.require('./test/internal/Sum');
    /* eslint-enable no-unused-vars */
    env = Z.concat(env, [_List.Type($.Unknown), Sum.Type]);
  }

  var def = $.create({checkTypes: checkTypes, env: env});

  //. ### Placeholder
  //.
  //. Sanctuary functions are designed with partial application in mind.
  //. In many cases one can define a more specific function in terms of
  //. a more general one simply by applying the more general function to
  //. some (but not all) of its arguments. For example, one could define
  //. `sum :: Foldable f => f Number -> Number` as `S.reduce(S.add, 0)`.
  //.
  //. In some cases, though, there are multiple orders in which one may
  //. wish to provide a function's arguments. `S.concat('prefix')` is a
  //. function which prefixes its argument, but how would one define a
  //. function which suffixes its argument? It's possible with the help
  //. of [`__`](#__), the special placeholder value.
  //.
  //. The placeholder indicates a hole to be filled at some future time.
  //. The following are all equivalent (`_` represents the placeholder):
  //.
  //.   - `f(x, y, z)`
  //.   - `f(_, y, z)(x)`
  //.   - `f(_, _, z)(x, y)`
  //.   - `f(_, _, z)(_, y)(x)`

  //# __ :: Placeholder
  //.
  //. The special [placeholder](#placeholder) value.
  //.
  //. ```javascript
  //. > S.map(S.concat('@'), ['foo', 'bar', 'baz'])
  //. ['@foo', '@bar', '@baz']
  //.
  //. > S.map(S.concat(S.__, '?'), ['foo', 'bar', 'baz'])
  //. ['foo?', 'bar?', 'baz?']
  //. ```
  S.__ = $.__;

  //. ### Classify

  //# type :: Any -> { namespace :: Maybe String, name :: String, version :: NonNegativeInteger }
  //.
  //. Returns the result of parsing the [type identifier][] of the given value.
  //.
  //. ```javascript
  //. > S.type(S.Just(42))
  //. {namespace: Just('sanctuary'), name: 'Maybe', version: 0}
  //.
  //. > S.type([1, 2, 3])
  //. {namespace: Nothing, name: 'Array', version: 0}
  //. ```
  S.type =
  def('type',
      {},
      [$.Any,
       $.RecordType({namespace: $Maybe($.String),
                     name: $.String,
                     version: $.NonNegativeInteger})],
      function(x) {
        var r = type.parse(type(x));
        r.namespace = toMaybe(r.namespace);
        return r;
      });

  //# is :: TypeRep a -> Any -> Boolean
  //.
  //. Takes a [type representative](#type-representatives) and a value of any
  //. type and returns `true` [iff][] the given value is of the specified type.
  //. Subtyping is not respected.
  //.
  //. ```javascript
  //. > S.is(Number, 42)
  //. true
  //.
  //. > S.is(Object, 42)
  //. false
  //.
  //. > S.is(String, 42)
  //. false
  //. ```
  function is(typeRep, x) {
    var xType = type(x);
    if ($.String._test(typeRep['@@type'])) {
      return xType === typeRep['@@type'];
    } else {
      var match = /function (\w*)/.exec(typeRep);
      return match != null && match[1] === xType;
    }
  }
  S.is = def('is', {}, [TypeRep(a), $.Any, $.Boolean], is);

  //. ### Showable

  //# toString :: Any -> String
  //.
  //. Alias of [`Z.toString`][].
  //.
  //. ```javascript
  //. > S.toString(-0)
  //. '-0'
  //.
  //. > S.toString(['foo', 'bar', 'baz'])
  //. '["foo", "bar", "baz"]'
  //.
  //. > S.toString({x: 1, y: 2, z: 3})
  //. '{"x": 1, "y": 2, "z": 3}'
  //.
  //. > S.toString(S.Left(S.Right(S.Just(S.Nothing))))
  //. 'Left(Right(Just(Nothing)))'
  //. ```
  S.toString = def('toString', {}, [$.Any, $.String], Z.toString);

  //. ### Fantasy Land
  //.
  //. Sanctuary is compatible with the [Fantasy Land][] specification.

  //# equals :: Setoid a => a -> a -> Boolean
  //.
  //. Curried version of [`Z.equals`][] which requires two arguments of the
  //. same type.
  //.
  //. To compare values of different types first use [`create`](#create) to
  //. create a Sanctuary module with type checking disabled, then use that
  //. module's `equals` function.
  //.
  //. ```javascript
  //. > S.equals(0, -0)
  //. true
  //.
  //. > S.equals(NaN, NaN)
  //. true
  //.
  //. > S.equals(S.Just([1, 2, 3]), S.Just([1, 2, 3]))
  //. true
  //.
  //. > S.equals(S.Just([1, 2, 3]), S.Just([1, 2, 4]))
  //. false
  //. ```
  S.equals = def('equals', {a: [Z.Setoid]}, [a, a, $.Boolean], Z.equals);

  //# lt :: Ord a => a -> (a -> Boolean)
  //.
  //. Returns `true` [iff][] the *second* argument is less than the first
  //. according to [`Z.lt`][]. The arguments must be provided one at a time.
  //.
  //. See also [`lt_`](#lt_).
  //.
  //. ```javascript
  //. > S.filter(S.lt(3), [1, 2, 3, 4, 5])
  //. [1, 2]
  //. ```
  S.lt = def('lt', {a: [Z.Ord]}, [a, $.Predicate(a)], flip$(Z.lt));

  //# lt_ :: Ord a => a -> a -> Boolean
  //.
  //. Returns `true` [iff][] the first argument is less than the second
  //. according to [`Z.lt`][].
  //.
  //. See also [`lt`](#lt).
  //.
  //. ```javascript
  //. > S.lt_([1, 2, 3], [1, 2, 3])
  //. false
  //.
  //. > S.lt_([1, 2, 3], [1, 2, 4])
  //. true
  //.
  //. > S.lt_([1, 2, 3], [1, 2])
  //. false
  //. ```
  S.lt_ = def('lt_', {a: [Z.Ord]}, [a, a, $.Boolean], Z.lt);

  //# lte :: Ord a => a -> (a -> Boolean)
  //.
  //. Returns `true` [iff][] the *second* argument is less than or equal to
  //. the first according to [`Z.lte`][]. The arguments must be provided one
  //. at a time.
  //.
  //. See also [`lte_`](#lte_).
  //.
  //. ```javascript
  //. > S.filter(S.lte(3), [1, 2, 3, 4, 5])
  //. [1, 2, 3]
  //. ```
  S.lte = def('lte', {a: [Z.Ord]}, [a, $.Predicate(a)], flip$(Z.lte));

  //# lte_ :: Ord a => a -> a -> Boolean
  //.
  //. Returns `true` [iff][] the first argument is less than or equal to the
  //. second according to [`Z.lte`][].
  //.
  //. See also [`lte`](#lte).
  //.
  //. ```javascript
  //. > S.lte_([1, 2, 3], [1, 2, 3])
  //. true
  //.
  //. > S.lte_([1, 2, 3], [1, 2, 4])
  //. true
  //.
  //. > S.lte_([1, 2, 3], [1, 2])
  //. false
  //. ```
  S.lte_ = def('lte_', {a: [Z.Ord]}, [a, a, $.Boolean], Z.lte);

  //# gt :: Ord a => a -> (a -> Boolean)
  //.
  //. Returns `true` [iff][] the *second* argument is greater than the first
  //. according to [`Z.gt`][]. The arguments must be provided one at a time.
  //.
  //. See also [`gt_`](#gt_).
  //.
  //. ```javascript
  //. > S.filter(S.gt(3), [1, 2, 3, 4, 5])
  //. [4, 5]
  //. ```
  S.gt = def('gt', {a: [Z.Ord]}, [a, $.Predicate(a)], flip$(Z.gt));

  //# gt_ :: Ord a => a -> a -> Boolean
  //.
  //. Returns `true` [iff][] the first argument is greater than the second
  //. according to [`Z.gt`][].
  //.
  //. See also [`gt`](#gt).
  //.
  //. ```javascript
  //. > S.gt_([1, 2, 3], [1, 2, 3])
  //. false
  //.
  //. > S.gt_([1, 2, 3], [1, 2, 4])
  //. false
  //.
  //. > S.gt_([1, 2, 3], [1, 2])
  //. true
  //. ```
  S.gt_ = def('gt_', {a: [Z.Ord]}, [a, a, $.Boolean], Z.gt);

  //# gte :: Ord a => a -> (a -> Boolean)
  //.
  //. Returns `true` [iff][] the *second* argument is greater than or equal
  //. to the first according to [`Z.gte`][]. The arguments must be provided
  //. one at a time.
  //.
  //. See also [`gte_`](#gte_).
  //.
  //. ```javascript
  //. > S.filter(S.gte(3), [1, 2, 3, 4, 5])
  //. [3, 4, 5]
  //. ```
  S.gte = def('gte', {a: [Z.Ord]}, [a, $.Predicate(a)], flip$(Z.gte));

  //# gte_ :: Ord a => a -> a -> Boolean
  //.
  //. Returns `true` [iff][] the first argument is greater than or equal to
  //. the second according to [`Z.gte`][].
  //.
  //. See also [`gte`](#gte).
  //.
  //. ```javascript
  //. > S.gte_([1, 2, 3], [1, 2, 3])
  //. true
  //.
  //. > S.gte_([1, 2, 3], [1, 2, 4])
  //. false
  //.
  //. > S.gte_([1, 2, 3], [1, 2])
  //. true
  //. ```
  S.gte_ = def('gte_', {a: [Z.Ord]}, [a, a, $.Boolean], Z.gte);

  //# min :: Ord a => a -> a -> a
  //.
  //. Returns the smaller of its two arguments (according to [`Z.lte`][]).
  //.
  //. See also [`max`](#max).
  //.
  //. ```javascript
  //. > S.min(10, 2)
  //. 2
  //.
  //. > S.min(new Date('1999-12-31'), new Date('2000-01-01'))
  //. new Date('1999-12-31')
  //.
  //. > S.min('10', '2')
  //. '10'
  //. ```
  S.min = def('min', {a: [Z.Ord]}, [a, a, a], Z.min);

  //# max :: Ord a => a -> a -> a
  //.
  //. Returns the larger of its two arguments (according to [`Z.lte`][]).
  //.
  //. See also [`min`](#min).
  //.
  //. ```javascript
  //. > S.max(10, 2)
  //. 10
  //.
  //. > S.max(new Date('1999-12-31'), new Date('2000-01-01'))
  //. new Date('2000-01-01')
  //.
  //. > S.max('10', '2')
  //. '2'
  //. ```
  S.max = def('max', {a: [Z.Ord]}, [a, a, a], Z.max);

  //# id :: Category c => TypeRep c -> c
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.id`][].
  //.
  //. ```javascript
  //. > S.id(Function)(42)
  //. 42
  //. ```
  S.id = def('id', {c: [Z.Category]}, [TypeRep(c), c], Z.id);

  //# concat :: Semigroup a => a -> a -> a
  //.
  //. Curried version of [`Z.concat`][].
  //.
  //. ```javascript
  //. > S.concat('abc', 'def')
  //. 'abcdef'
  //.
  //. > S.concat([1, 2, 3], [4, 5, 6])
  //. [1, 2, 3, 4, 5, 6]
  //.
  //. > S.concat({x: 1, y: 2}, {y: 3, z: 4})
  //. {x: 1, y: 3, z: 4}
  //.
  //. > S.concat(S.Just([1, 2, 3]), S.Just([4, 5, 6]))
  //. Just([1, 2, 3, 4, 5, 6])
  //.
  //. > S.concat(Sum(18), Sum(24))
  //. Sum(42)
  //. ```
  S.concat = def('concat', {a: [Z.Semigroup]}, [a, a, a], Z.concat);

  //# empty :: Monoid a => TypeRep a -> a
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.empty`][].
  //.
  //. ```javascript
  //. > S.empty(String)
  //. ''
  //.
  //. > S.empty(Array)
  //. []
  //.
  //. > S.empty(Object)
  //. {}
  //.
  //. > S.empty(Sum)
  //. Sum(0)
  //. ```
  S.empty = def('empty', {a: [Z.Monoid]}, [TypeRep(a), a], Z.empty);

  //# invert :: Group g => g -> g
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.invert`][].
  //.
  //. ```javascript
  //. > S.invert(Sum(5))
  //. Sum(-5)
  //. ```
  S.invert = def('invert', {g: [Z.Group]}, [g, g], Z.invert);

  //# map :: Functor f => (a -> b) -> f a -> f b
  //.
  //. Curried version of [`Z.map`][].
  //.
  //. ```javascript
  //. > S.map(Math.sqrt, [1, 4, 9])
  //. [1, 2, 3]
  //.
  //. > S.map(Math.sqrt, {x: 1, y: 4, z: 9})
  //. {x: 1, y: 2, z: 3}
  //.
  //. > S.map(Math.sqrt, S.Just(9))
  //. Just(3)
  //.
  //. > S.map(Math.sqrt, S.Right(9))
  //. Right(3)
  //. ```
  //.
  //. Replacing `Functor f => f` with `Function x` produces the B combinator
  //. from combinatory logic (i.e. [`compose`](#compose)):
  //.
  //.     Functor f => (a -> b) -> f a -> f b
  //.     (a -> b) -> Function x a -> Function x b
  //.     (a -> c) -> Function x a -> Function x c
  //.     (b -> c) -> Function x b -> Function x c
  //.     (b -> c) -> Function a b -> Function a c
  //.     (b -> c) -> (a -> b) -> (a -> c)
  //.
  //. ```javascript
  //. > S.map(Math.sqrt, S.add(1))(99)
  //. 10
  //. ```
  S.map = def('map', {f: [Z.Functor]}, [Fn(a, b), f(a), f(b)], Z.map);

  //# bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d
  //.
  //. Curried version of [`Z.bimap`][].
  //.
  //. ```javascript
  //. > S.bimap(S.toUpper, Math.sqrt, S.Left('foo'))
  //. Left('FOO')
  //.
  //. > S.bimap(S.toUpper, Math.sqrt, S.Right(64))
  //. Right(8)
  //. ```
  S.bimap =
  def('bimap',
      {p: [Z.Bifunctor]},
      [Fn(a, b), Fn(c, d), p(a, c), p(b, d)],
      Z.bimap);

  //# promap :: Profunctor p => (a -> b) -> (c -> d) -> p b c -> p a d
  //.
  //. Curried version of [`Z.promap`][].
  //.
  //. ```javascript
  //. > S.promap(Math.abs, S.add(1), Math.sqrt)(-100)
  //. 11
  //. ```
  S.promap =
  def('promap',
      {p: [Z.Profunctor]},
      [Fn(a, b), Fn(c, d), p(b, c), p(a, d)],
      Z.promap);

  //# alt :: Alt f => f a -> f a -> f a
  //.
  //. Curried version of [`Z.alt`][].
  //.
  //. ```javascript
  //. > S.alt(S.Nothing, S.Just(1))
  //. Just(1)
  //.
  //. > S.alt(S.Just(2), S.Just(3))
  //. Just(2)
  //.
  //. > S.alt(S.Left('X'), S.Right(1))
  //. Right(1)
  //.
  //. > S.alt(S.Right(2), S.Right(3))
  //. Right(2)
  //. ```
  S.alt = def('alt', {f: [Z.Alt]}, [f(a), f(a), f(a)], Z.alt);

  //# zero :: Plus f => TypeRep f -> f a
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.zero`][].
  //.
  //. ```javascript
  //. > S.zero(Array)
  //. []
  //.
  //. > S.zero(Object)
  //. {}
  //.
  //. > S.zero(S.Maybe)
  //. Nothing
  //. ```
  S.zero =
  def('zero', {f: [Z.Plus]}, [TypeRep($.TypeVariable('f')), f(a)], Z.zero);

  //# reduce :: Foldable f => (b -> a -> b) -> b -> f a -> b
  //.
  //. Takes a curried binary function, an initial value, and a [Foldable][],
  //. and applies the function to the initial value and the Foldable's first
  //. value, then applies the function to the result of the previous
  //. application and the Foldable's second value. Repeats this process
  //. until each of the Foldable's values has been used. Returns the initial
  //. value if the Foldable is empty; the result of the final application
  //. otherwise.
  //.
  //. ```javascript
  //. > S.reduce(S.add, 0, [1, 2, 3, 4, 5])
  //. 15
  //.
  //. > S.reduce(xs => x => [x].concat(xs), [], [1, 2, 3, 4, 5])
  //. [5, 4, 3, 2, 1]
  //. ```
  function reduce(f, initial, foldable) {
    return Z.reduce(uncurry2(f), initial, foldable);
  }
  S.reduce =
  def('reduce', {f: [Z.Foldable]}, [Fn(a, Fn(b, a)), a, f(b), a], reduce);

  //# traverse :: (Applicative f, Traversable t) => TypeRep f -> (a -> f b) -> t a -> f (t b)
  //.
  //. Curried version of [`Z.traverse`][].
  //.
  //. ```javascript
  //. > S.traverse(Array, S.words, S.Just('foo bar baz'))
  //. [Just('foo'), Just('bar'), Just('baz')]
  //.
  //. > S.traverse(Array, S.words, S.Nothing)
  //. [Nothing]
  //.
  //. > S.traverse(S.Maybe, S.parseInt(16), ['A', 'B', 'C'])
  //. Just([10, 11, 12])
  //.
  //. > S.traverse(S.Maybe, S.parseInt(16), ['A', 'B', 'C', 'X'])
  //. Nothing
  //.
  //. > S.traverse(S.Maybe, S.parseInt(16), {a: 'A', b: 'B', c: 'C'})
  //. Just({a: 10, b: 11, c: 12})
  //.
  //. > S.traverse(S.Maybe, S.parseInt(16), {a: 'A', b: 'B', c: 'C', x: 'X'})
  //. Nothing
  //. ```
  S.traverse =
  def('traverse',
      {f: [Z.Applicative], t: [Z.Traversable]},
      [TypeRep($.TypeVariable('f')), Fn(a, f(b)), t(a), f(t(b))],
      Z.traverse);

  //# sequence :: (Applicative f, Traversable t) => TypeRep f -> t (f a) -> f (t a)
  //.
  //. Curried version of [`Z.sequence`][]. Inverts the given `t (f a)`
  //. to produce an `f (t a)`.
  //.
  //. ```javascript
  //. > S.sequence(Array, S.Just([1, 2, 3]))
  //. [Just(1), Just(2), Just(3)]
  //.
  //. > S.sequence(S.Maybe, [S.Just(1), S.Just(2), S.Just(3)])
  //. Just([1, 2, 3])
  //.
  //. > S.sequence(S.Maybe, [S.Just(1), S.Just(2), S.Nothing])
  //. Nothing
  //.
  //. > S.sequence(S.Maybe, {a: S.Just(1), b: S.Just(2), c: S.Just(3)})
  //. Just({a: 1, b: 2, c: 3})
  //.
  //. > S.sequence(S.Maybe, {a: S.Just(1), b: S.Just(2), c: S.Nothing})
  //. Nothing
  //. ```
  S.sequence =
  def('sequence',
      {f: [Z.Applicative], t: [Z.Traversable]},
      [TypeRep($.TypeVariable('f')), t(f(a)), f(t(a))],
      Z.sequence);

  //# ap :: Apply f => f (a -> b) -> f a -> f b
  //.
  //. Curried version of [`Z.ap`][].
  //.
  //. ```javascript
  //. > S.ap([Math.sqrt, x => x * x], [1, 4, 9, 16, 25])
  //. [1, 2, 3, 4, 5, 1, 16, 81, 256, 625]
  //.
  //. > S.ap({x: Math.sqrt, y: S.add(1), z: S.sub(1)}, {w: 4, x: 4, y: 4})
  //. {x: 2, y: 5}
  //.
  //. > S.ap(S.Just(Math.sqrt), S.Just(64))
  //. Just(8)
  //. ```
  //.
  //. Replacing `Apply f => f` with `Function x` produces the S combinator
  //. from combinatory logic:
  //.
  //.     Apply f => f (a -> b) -> f a -> f b
  //.     Function x (a -> b) -> Function x a -> Function x b
  //.     Function x (a -> c) -> Function x a -> Function x c
  //.     Function x (b -> c) -> Function x b -> Function x c
  //.     Function a (b -> c) -> Function a b -> Function a c
  //.     (a -> b -> c) -> (a -> b) -> (a -> c)
  //.
  //. ```javascript
  //. > S.ap(s => n => s.slice(0, n), s => Math.ceil(s.length / 2))('Haskell')
  //. 'Hask'
  //. ```
  S.ap =
  def('ap',
      {f: [Z.Apply]},
      [f(Fn(a, b)), f(a), f(b)],
      Z.ap);

  //# lift2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c
  //.
  //. Promotes a curried binary function to a function which operates on two
  //. [Apply][]s.
  //.
  //. ```javascript
  //. > S.lift2(S.add, S.Just(2), S.Just(3))
  //. Just(5)
  //.
  //. > S.lift2(S.add, S.Just(2), S.Nothing)
  //. Nothing
  //.
  //. > S.lift2(S.and, S.Just(true), S.Just(true))
  //. Just(true)
  //.
  //. > S.lift2(S.and, S.Just(true), S.Just(false))
  //. Just(false)
  //. ```
  S.lift2 =
  def('lift2', {f: [Z.Apply]}, [Fn(a, Fn(b, c)), f(a), f(b), f(c)], Z.lift2);

  //# lift3 :: Apply f => (a -> b -> c -> d) -> f a -> f b -> f c -> f d
  //.
  //. Promotes a curried ternary function to a function which operates on three
  //. [Apply][]s.
  //.
  //. ```javascript
  //. > S.lift3(S.reduce, S.Just(S.add), S.Just(0), S.Just([1, 2, 3]))
  //. Just(6)
  //.
  //. > S.lift3(S.reduce, S.Just(S.add), S.Just(0), S.Nothing)
  //. Nothing
  //. ```
  S.lift3 =
  def('lift3',
      {f: [Z.Apply]},
      [Fn(a, Fn(b, Fn(c, d))), f(a), f(b), f(c), f(d)],
      Z.lift3);

  //# apFirst :: Apply f => f a -> f b -> f a
  //.
  //. Curried version of [`Z.apFirst`][]. Combines two effectful actions,
  //. keeping only the result of the first. Equivalent to Haskell's `(<*)`
  //. function.
  //.
  //. See also [`apSecond`](#apSecond).
  //.
  //. ```javascript
  //. > S.apFirst([1, 2], [3, 4])
  //. [1, 1, 2, 2]
  //.
  //. > S.apFirst(S.Just(1), S.Just(2))
  //. Just(1)
  //. ```
  S.apFirst = def('apFirst', {f: [Z.Apply]}, [f(a), f(b), f(a)], Z.apFirst);

  //# apSecond :: Apply f => f a -> f b -> f b
  //.
  //. Curried version of [`Z.apSecond`][]. Combines two effectful actions,
  //. keeping only the result of the second. Equivalent to Haskell's `(*>)`
  //. function.
  //.
  //. See also [`apFirst`](#apFirst).
  //.
  //. ```javascript
  //. > S.apSecond([1, 2], [3, 4])
  //. [3, 4, 3, 4]
  //.
  //. > S.apSecond(S.Just(1), S.Just(2))
  //. Just(2)
  //. ```
  S.apSecond = def('apSecond', {f: [Z.Apply]}, [f(a), f(b), f(b)], Z.apSecond);

  //# of :: Applicative f => TypeRep f -> a -> f a
  //.
  //. Curried version of [`Z.of`][].
  //.
  //. ```javascript
  //. > S.of(Array, 42)
  //. [42]
  //.
  //. > S.of(Function, 42)(null)
  //. 42
  //.
  //. > S.of(S.Maybe, 42)
  //. Just(42)
  //.
  //. > S.of(S.Either, 42)
  //. Right(42)
  //. ```
  S.of =
  def('of',
      {f: [Z.Applicative]},
      [TypeRep($.TypeVariable('f')), a, f(a)],
      Z.of);

  //# chain :: Chain m => (a -> m b) -> m a -> m b
  //.
  //. Curried version of [`Z.chain`][].
  //.
  //. ```javascript
  //. > S.chain(x => [x, x], [1, 2, 3])
  //. [1, 1, 2, 2, 3, 3]
  //.
  //. > S.chain(n => s => s.slice(0, n), s => Math.ceil(s.length / 2))('slice')
  //. 'sli'
  //.
  //. > S.chain(S.parseInt(10), S.Just('123'))
  //. Just(123)
  //.
  //. > S.chain(S.parseInt(10), S.Just('XXX'))
  //. Nothing
  //. ```
  S.chain = def('chain', {m: [Z.Chain]}, [Fn(a, m(b)), m(a), m(b)], Z.chain);

  //# join :: Chain m => m (m a) -> m a
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.join`][].
  //. Removes one level of nesting from a nested monadic structure.
  //.
  //. ```javascript
  //. > S.join([[1], [2], [3]])
  //. [1, 2, 3]
  //.
  //. > S.join([[[1, 2, 3]]])
  //. [[1, 2, 3]]
  //.
  //. > S.join(S.Just(S.Just(1)))
  //. S.Just(1)
  //. ```
  //.
  //. Replacing `Chain m => m` with `Function x` produces the W combinator
  //. from combinatory logic:
  //.
  //.     Chain m => m (m a) -> m a
  //.     Function x (Function x a) -> Function x a
  //.     (x -> x -> a) -> (x -> a)
  //.
  //. ```javascript
  //. > S.join(S.concat)('abc')
  //. 'abcabc'
  //. ```
  S.join = def('join', {m: [Z.Chain]}, [m(m(a)), m(a)], Z.join);

  //# chainRec :: ChainRec m => TypeRep m -> (a -> m (Either a b)) -> a -> m b
  //.
  //. Performs a [`chain`](#chain)-like computation with constant stack usage.
  //. Similar to [`Z.chainRec`][], but curried and more convenient due to the
  //. use of the Either type to indicate completion (via a Right).
  //.
  //. ```javascript
  //. > S.chainRec(Array,
  //. .            s => s.length === 2 ? S.map(S.Right, [s + '!', s + '?'])
  //. .                                : S.map(S.Left, [s + 'o', s + 'n']),
  //. .            '')
  //. ['oo!', 'oo?', 'on!', 'on?', 'no!', 'no?', 'nn!', 'nn?']
  //. ```
  function chainRec(typeRep, f, x) {
    function step(next, done, x) {
      return Z.map(function(e) { return either(next, done, e); }, f(x));
    }
    return Z.chainRec(typeRep, step, x);
  }
  S.chainRec =
  def('chainRec',
      {m: [Z.ChainRec]},
      [TypeRep($.TypeVariable('m')), Fn(a, m($Either(a, b))), a, m(b)],
      chainRec);

  //# extend :: Extend w => (w a -> b) -> w a -> w b
  //.
  //. Curried version of [`Z.extend`][].
  //.
  //. ```javascript
  //. > S.extend(S.joinWith(''), ['x', 'y', 'z'])
  //. ['xyz', 'yz', 'z']
  //. ```
  S.extend =
  def('extend', {w: [Z.Extend]}, [Fn(w(a), b), w(a), w(b)], Z.extend);

  //# extract :: Comonad w => w a -> a
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.extract`][].
  S.extract =
  def('extract', {w: [Z.Comonad]}, [w(a), a], Z.extract);

  //# contramap :: Contravariant f => (b -> a) -> f a -> f b
  //.
  //. [Type-safe][sanctuary-def] version of [`Z.contramap`][].
  //.
  //. ```javascript
  //. > S.contramap(s => s.length, Math.sqrt)('Sanctuary')
  //. 3
  //. ```
  S.contramap =
  def('contramap',
      {f: [Z.Contravariant]},
      [Fn(b, a), f(a), f(b)],
      Z.contramap);

  //# filter :: (Applicative f, Foldable f, Monoid (f a)) => (a -> Boolean) -> f a -> f a
  //.
  //. Curried version of [`Z.filter`][]. Filters its second argument in
  //. accordance with the given predicate.
  //.
  //. See also [`filterM`](#filterM).
  //.
  //. ```javascript
  //. > S.filter(S.odd, [1, 2, 3, 4, 5])
  //. [1, 3, 5]
  //. ```
  S.filter =
  def('filter',
      {f: [Z.Applicative, Z.Foldable, Z.Monoid]},
      [$.Predicate(a), f(a), f(a)],
      Z.filter);

  //# filterM :: (Alternative m, Monad m) => (a -> Boolean) -> m a -> m a
  //.
  //. Curried version of [`Z.filterM`][]. Filters its second argument in
  //. accordance with the given predicate.
  //.
  //. See also [`filter`](#filter).
  //.
  //. ```javascript
  //. > S.filterM(S.odd, [1, 2, 3, 4, 5])
  //. [1, 3, 5]
  //.
  //. > S.filterM(S.odd, S.Just(9))
  //. Just(9)
  //.
  //. > S.filterM(S.odd, S.Just(4))
  //. Nothing
  //. ```
  S.filterM =
  def('filterM',
      {m: [Z.Alternative, Z.Monad]},
      [$.Predicate(a), m(a), m(a)],
      Z.filterM);

  //# takeWhile :: (Foldable f, Alternative f) => (a -> Boolean) -> f a -> f a
  //.
  //. Discards the first inner value which does not satisfy the predicate, and
  //. all subsequent inner values.
  //.
  //. ```javascript
  //. > S.takeWhile(S.odd, [3, 3, 3, 7, 6, 3, 5, 4])
  //. [3, 3, 3, 7]
  //.
  //. > S.takeWhile(S.even, [3, 3, 3, 7, 6, 3, 5, 4])
  //. []
  //. ```
  S.takeWhile =
  def('takeWhile',
      {f: [Z.Foldable, Z.Alternative]},
      [$.Predicate(a), f(a), f(a)],
      Z.takeWhile);

  //# dropWhile :: (Foldable f, Alternative f) => (a -> Boolean) -> f a -> f a
  //.
  //. Retains the first inner value which does not satisfy the predicate, and
  //. all subsequent inner values.
  //.
  //. ```javascript
  //. > S.dropWhile(S.odd, [3, 3, 3, 7, 6, 3, 5, 4])
  //. [6, 3, 5, 4]
  //.
  //. > S.dropWhile(S.even, [3, 3, 3, 7, 6, 3, 5, 4])
  //. [3, 3, 3, 7, 6, 3, 5, 4]
  //. ```
  S.dropWhile =
  def('dropWhile',
      {f: [Z.Foldable, Z.Alternative]},
      [$.Predicate(a), f(a), f(a)],
      Z.dropWhile);

  //. ### Combinator

  //# I :: a -> a
  //.
  //. The I combinator. Returns its argument. Equivalent to Haskell's `id`
  //. function.
  //.
  //. ```javascript
  //. > S.I('foo')
  //. 'foo'
  //. ```
  function I(x) {
    return x;
  }
  S.I = def('I', {}, [a, a], I);

  //# K :: a -> b -> a
  //.
  //. The K combinator. Takes two values and returns the first. Equivalent to
  //. Haskell's `const` function.
  //.
  //. ```javascript
  //. > S.K('foo', 'bar')
  //. 'foo'
  //.
  //. > S.map(S.K(42), S.range(0, 5))
  //. [42, 42, 42, 42, 42]
  //. ```
  function K(x, y) {
    return x;
  }
  S.K = def('K', {}, [a, b, a], K);

  //# A :: (a -> b) -> a -> b
  //.
  //. The A combinator. Takes a function and a value, and returns the result
  //. of applying the function to the value. Equivalent to Haskell's `($)`
  //. function.
  //.
  //. ```javascript
  //. > S.A(S.add(1), 42)
  //. 43
  //.
  //. > S.map(S.A(S.__, 100), [S.add(1), Math.sqrt])
  //. [101, 10]
  //. ```
  function A(f, x) {
    return f(x);
  }
  S.A = def('A', {}, [Fn(a, b), a, b], A);

  //# T :: a -> (a -> b) -> b
  //.
  //. The T ([thrush][]) combinator. Takes a value and a function, and returns
  //. the result of applying the function to the value. Equivalent to Haskell's
  //. `(&)` function.
  //.
  //. ```javascript
  //. > S.T(42, S.add(1))
  //. 43
  //.
  //. > S.map(S.T(100), [S.add(1), Math.sqrt])
  //. [101, 10]
  //. ```
  function T(x, f) {
    return f(x);
  }
  S.T = def('T', {}, [a, Fn(a, b), b], T);

  //. ### Function

  //# curry2 :: ((a, b) -> c) -> a -> b -> c
  //.
  //. Curries the given binary function.
  //.
  //. ```javascript
  //. > S.map(S.curry2(Math.pow)(10), [1, 2, 3])
  //. [10, 100, 1000]
  //.
  //. > S.map(S.curry2(Math.pow, 10), [1, 2, 3])
  //. [10, 100, 1000]
  //. ```
  function curry2(f, x, y) {
    return f(x, y);
  }
  S.curry2 =
  def('curry2',
      {},
      [$.Function([a, b, c]), a, b, c],
      curry2);

  //# curry3 :: ((a, b, c) -> d) -> a -> b -> c -> d
  //.
  //. Curries the given ternary function.
  //.
  //. ```javascript
  //. > global.replaceString = S.curry3((what, replacement, string) =>
  //. .   string.replace(what, replacement)
  //. . )
  //. replaceString
  //.
  //. > replaceString('banana')('orange')('banana icecream')
  //. 'orange icecream'
  //.
  //. > replaceString('banana', 'orange', 'banana icecream')
  //. 'orange icecream'
  //. ```
  function curry3(f, x, y, z) {
    return f(x, y, z);
  }
  S.curry3 =
  def('curry3',
      {},
      [$.Function([a, b, c, d]), a, b, c, d],
      curry3);

  //# curry4 :: ((a, b, c, d) -> e) -> a -> b -> c -> d -> e
  //.
  //. Curries the given quaternary function.
  //.
  //. ```javascript
  //. > global.createRect = S.curry4((x, y, width, height) =>
  //. .   ({x, y, width, height})
  //. . )
  //. createRect
  //.
  //. > createRect(0)(0)(10)(10)
  //. {x: 0, y: 0, width: 10, height: 10}
  //.
  //. > createRect(0, 0, 10, 10)
  //. {x: 0, y: 0, width: 10, height: 10}
  //. ```
  function curry4(f, w, x, y, z) {
    return f(w, x, y, z);
  }
  S.curry4 =
  def('curry4',
      {},
      [$.Function([a, b, c, d, e]), a, b, c, d, e],
      curry4);

  //# curry5 :: ((a, b, c, d, e) -> f) -> a -> b -> c -> d -> e -> f
  //.
  //. Curries the given quinary function.
  //.
  //. ```javascript
  //. > global.toUrl = S.curry5((protocol, creds, hostname, port, pathname) =>
  //. .   protocol + '//' +
  //. .   S.maybe('', _ => _.username + ':' + _.password + '@', creds) +
  //. .   hostname +
  //. .   S.maybe('', S.concat(':'), port) +
  //. .   pathname
  //. . )
  //. toUrl
  //.
  //. > toUrl('https:')(S.Nothing)('example.com')(S.Just('443'))('/foo/bar')
  //. 'https://example.com:443/foo/bar'
  //.
  //. > toUrl('https:', S.Nothing, 'example.com', S.Just('443'), '/foo/bar')
  //. 'https://example.com:443/foo/bar'
  //. ```
  function curry5(f, v, w, x, y, z) {
    return f(v, w, x, y, z);
  }
  S.curry5 =
  def('curry5',
      {},
      [$.Function([a, b, c, d, e, r]), a, b, c, d, e, r],
      curry5);

  //# flip :: (a -> b -> c) -> b -> a -> c
  //.
  //. Takes a curried binary function and two values, and returns the
  //. result of applying the function to the values in reverse order.
  //.
  //. This is the C combinator from combinatory logic.
  //.
  //. ```javascript
  //. > S.flip(S.concat, 'foo', 'bar')
  //. 'barfoo'
  //. ```
  function flip(f, x, y) {
    return f(y)(x);
  }
  S.flip = def('flip', {}, [Fn(a, Fn(b, c)), b, a, c], flip);

  //. ### Composition

  //# compose :: Semigroupoid s => s b c -> s a b -> s a c
  //.
  //. Curried version of [`Z.compose`][].
  //.
  //. When specialized to Function, `compose` composes two unary functions,
  //. from right to left (this is the B combinator from combinatory logic).
  //.
  //. The generalized type signature indicates that `compose` is compatible
  //. with any [Semigroupoid][].
  //.
  //. See also [`pipe`](#pipe).
  //.
  //. ```javascript
  //. > S.compose(Math.sqrt, S.add(1))(99)
  //. 10
  //. ```
  S.compose =
  def('compose',
      {s: [Z.Semigroupoid]},
      [s(b, c), s(a, b), s(a, c)],
      Z.compose);

  //# pipe :: [(a -> b), (b -> c), ..., (m -> n)] -> a -> n
  //.
  //. Takes an array of functions assumed to be unary and a value of any type,
  //. and returns the result of applying the sequence of transformations to
  //. the initial value.
  //.
  //. In general terms, `pipe` performs left-to-right composition of an array
  //. of functions. `pipe([f, g, h], x)` is equivalent to `h(g(f(x)))`.
  //.
  //. ```javascript
  //. > S.pipe([S.add(1), Math.sqrt, S.sub(1)], 99)
  //. 9
  //. ```
  function pipe(fs, x) {
    return Z.reduce(function(x, f) { return f(x); }, x, fs);
  }
  S.pipe = def('pipe', {}, [$.Array($.AnyFunction), a, b], pipe);

  //# on :: (b -> b -> c) -> (a -> b) -> a -> a -> c
  //.
  //. Takes a binary function `f`, a unary function `g`, and two
  //. values `x` and `y`. Returns `f(g(x))(g(y))`.
  //.
  //. This is the P combinator from combinatory logic.
  //.
  //. ```javascript
  //. > S.on(S.concat, S.reverse, [1, 2, 3], [4, 5, 6])
  //. [3, 2, 1, 6, 5, 4]
  //. ```
  function on(f, g, x, y) {
    return f(g(x))(g(y));
  }
  S.on = def('on', {}, [Fn(b, Fn(b, c)), Fn(a, b), a, a, c], on);

  //. ### Maybe type
  //.
  //. The Maybe type represents optional values: a value of type `Maybe a` is
  //. either a Just whose value is of type `a` or Nothing (with no value).
  //.
  //. The Maybe type satisfies the [Ord][], [Monoid][], [Monad][],
  //. [Alternative][], [Traversable][], and [Extend][] specifications.

  //# MaybeType :: Type -> Type
  //.
  //. A [`UnaryType`][UnaryType] for use with [sanctuary-def][].
  S.MaybeType = $Maybe;

  //# Maybe :: TypeRep Maybe
  //.
  //. The [type representative](#type-representatives) for the Maybe type.
  var Maybe = S.Maybe = {prototype: _Maybe.prototype};

  Maybe.prototype.constructor = Maybe;

  function _Maybe(tag, value) {
    this.isNothing = tag === 'Nothing';
    this.isJust = tag === 'Just';
    if (this.isJust) this.value = value;

    //  Add "fantasy-land/concat" method conditionally so that Just('abc')
    //  satisfies the requirements of Semigroup but Just(123) does not.
    if (this.isNothing || Z.Semigroup.test(this.value)) {
      this['fantasy-land/concat'] = Maybe$prototype$concat;
    }

    if (this.isNothing || Z.Setoid.test(this.value)) {
      this['fantasy-land/equals'] = Maybe$prototype$equals;
    }

    if (this.isNothing || Z.Ord.test(this.value)) {
      this['fantasy-land/lte'] = Maybe$prototype$lte;
    }
  }

  //# Nothing :: Maybe a
  //.
  //. Nothing.
  //.
  //. ```javascript
  //. > S.Nothing
  //. Nothing
  //. ```
  var Nothing = S.Nothing = new _Maybe('Nothing');

  //# Just :: a -> Maybe a
  //.
  //. Takes a value of any type and returns a Just with the given value.
  //.
  //. ```javascript
  //. > S.Just(42)
  //. Just(42)
  //. ```
  function Just(x) {
    return new _Maybe('Just', x);
  }
  S.Just = def('Just', {}, [a, $Maybe(a)], Just);

  //# Maybe.@@type :: String
  //.
  //. Maybe type identifier, `'sanctuary/Maybe'`.
  Maybe['@@type'] = maybeTypeIdent;

  //# Maybe.fantasy-land/empty :: () -> Maybe a
  //.
  //. Returns Nothing.
  //.
  //. It is idiomatic to use [`empty`](#empty) rather than use this function
  //. directly.
  //.
  //. ```javascript
  //. > S.empty(S.Maybe)
  //. Nothing
  //. ```
  Maybe['fantasy-land/empty'] = function() { return Nothing; };

  //# Maybe.fantasy-land/of :: a -> Maybe a
  //.
  //. Takes a value of any type and returns a Just with the given value.
  //.
  //. It is idiomatic to use [`of`](#of) rather than use this function
  //. directly.
  //.
  //. ```javascript
  //. > S.of(S.Maybe, 42)
  //. Just(42)
  //. ```
  Maybe['fantasy-land/of'] = Just;

  //# Maybe.fantasy-land/zero :: () -> Maybe a
  //.
  //. Returns Nothing.
  //.
  //. It is idiomatic to use [`zero`](#zero) rather than use this function
  //. directly.
  //.
  //. ```javascript
  //. > S.zero(S.Maybe)
  //. Nothing
  //. ```
  Maybe['fantasy-land/zero'] = function() { return Nothing; };

  //# Maybe#isNothing :: Maybe a ~> Boolean
  //.
  //. `true` if `this` is Nothing; `false` if `this` is a Just.
  //.
  //. ```javascript
  //. > S.Nothing.isNothing
  //. true
  //.
  //. > S.Just(42).isNothing
  //. false
  //. ```

  //# Maybe#isJust :: Maybe a ~> Boolean
  //.
  //. `true` if `this` is a Just; `false` if `this` is Nothing.
  //.
  //. ```javascript
  //. > S.Just(42).isJust
  //. true
  //.
  //. > S.Nothing.isJust
  //. false
  //. ```

  //# Maybe#toString :: Maybe a ~> () -> String
  //.
  //. Returns the string representation of the Maybe.
  //.
  //. ```javascript
  //. > S.toString(S.Nothing)
  //. 'Nothing'
  //.
  //. > S.toString(S.Just([1, 2, 3]))
  //. 'Just([1, 2, 3])'
  //. ```
  Maybe.prototype.toString = function() {
    return this.isJust ? 'Just(' + Z.toString(this.value) + ')' : 'Nothing';
  };

  //# Maybe#inspect :: Maybe a ~> () -> String
  //.
  //. Returns the string representation of the Maybe. This method is used by
  //. `util.inspect` and the REPL to format a Maybe for display.
  //.
  //. See also [`Maybe#toString`][].
  //.
  //. ```javascript
  //. > S.Nothing.inspect()
  //. 'Nothing'
  //.
  //. > S.Just([1, 2, 3]).inspect()
  //. 'Just([1, 2, 3])'
  //. ```
  Maybe.prototype.inspect = function() { return this.toString(); };

  //# Maybe#fantasy-land/equals :: Setoid a => Maybe a ~> Maybe a -> Boolean
  //.
  //. Takes a value `m` of the same type and returns `true` if:
  //.
  //.   - `this` and `m` are both Nothing; or
  //.
  //.   - `this` and `m` are both Justs, and their values are equal according
  //.     to [`Z.equals`][].
  //.
  //. It is idiomatic to use [`equals`](#equals) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.equals(S.Nothing, S.Nothing)
  //. true
  //.
  //. > S.equals(S.Just([1, 2, 3]), S.Just([1, 2, 3]))
  //. true
  //.
  //. > S.equals(S.Just([1, 2, 3]), S.Just([3, 2, 1]))
  //. false
  //.
  //. > S.equals(S.Just([1, 2, 3]), S.Nothing)
  //. false
  //. ```
  function Maybe$prototype$equals(other) {
    return this.isNothing ? other.isNothing
                          : other.isJust && Z.equals(this.value, other.value);
  }

  //# Maybe#fantasy-land/lte :: Ord a => Maybe a ~> Maybe a -> Boolean
  //.
  //. Takes a value `m` of the same type and returns `true` if:
  //.
  //.   - `this` is Nothing; or
  //.
  //.   - `this` and `m` are both Justs and the value of `this` is less than
  //.     or equal to the value of `m` according to [`Z.lte`][].
  //.
  //. It is idiomatic to use [`lte`](#lte) or [`lte_`](#lte_) rather than use
  //. this method directly.
  //.
  //. ```javascript
  //. > S.lte_(S.Nothing, S.Nothing)
  //. true
  //.
  //. > S.lte_(S.Nothing, S.Just(0))
  //. true
  //.
  //. > S.lte_(S.Just(0), S.Nothing)
  //. false
  //.
  //. > S.lte_(S.Just(0), S.Just(1))
  //. true
  //.
  //. > S.lte_(S.Just(1), S.Just(0))
  //. false
  //. ```
  function Maybe$prototype$lte(other) {
    return this.isNothing || other.isJust && Z.lte(this.value, other.value);
  }

  //# Maybe#fantasy-land/concat :: Semigroup a => Maybe a ~> Maybe a -> Maybe a
  //.
  //. Returns the result of concatenating two Maybe values of the same type.
  //. `a` must have a [Semigroup][].
  //.
  //. If `this` is Nothing and the argument is Nothing, this method returns
  //. Nothing.
  //.
  //. If `this` is a Just and the argument is a Just, this method returns a
  //. Just whose value is the result of concatenating this Just's value and
  //. the given Just's value.
  //.
  //. Otherwise, this method returns the Just.
  //.
  //. It is idiomatic to use [`concat`](#concat) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.concat(S.Nothing, S.Nothing)
  //. Nothing
  //.
  //. > S.concat(S.Just([1, 2, 3]), S.Just([4, 5, 6]))
  //. Just([1, 2, 3, 4, 5, 6])
  //.
  //. > S.concat(S.Nothing, S.Just([1, 2, 3]))
  //. Just([1, 2, 3])
  //.
  //. > S.concat(S.Just([1, 2, 3]), S.Nothing)
  //. Just([1, 2, 3])
  //. ```
  function Maybe$prototype$concat(other) {
    return this.isNothing ?
      other :
      other.isNothing ? this : Just(Z.concat(this.value, other.value));
  }

  //# Maybe#fantasy-land/map :: Maybe a ~> (a -> b) -> Maybe b
  //.
  //. Takes a function and returns `this` if `this` is Nothing; otherwise
  //. it returns a Just whose value is the result of applying the function
  //. to this Just's value.
  //.
  //. It is idiomatic to use [`map`](#map) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.map(Math.sqrt, S.Nothing)
  //. Nothing
  //.
  //. > S.map(Math.sqrt, S.Just(9))
  //. Just(3)
  //. ```
  Maybe.prototype['fantasy-land/map'] = function(f) {
    return this.isJust ? Just(f(this.value)) : this;
  };

  //# Maybe#fantasy-land/ap :: Maybe a ~> Maybe (a -> b) -> Maybe b
  //.
  //. Takes a Maybe and returns Nothing unless `this` is a Just *and* the
  //. argument is a Just, in which case it returns a Just whose value is
  //. the result of applying the given Just's value to this Just's value.
  //.
  //. It is idiomatic to use [`ap`](#ap) rather than use this method directly.
  //.
  //. ```javascript
  //. > S.ap(S.Nothing, S.Nothing)
  //. Nothing
  //.
  //. > S.ap(S.Nothing, S.Just(9))
  //. Nothing
  //.
  //. > S.ap(S.Just(Math.sqrt), S.Nothing)
  //. Nothing
  //.
  //. > S.ap(S.Just(Math.sqrt), S.Just(9))
  //. Just(3)
  //. ```
  Maybe.prototype['fantasy-land/ap'] = function(other) {
    return other.isJust ? Z.map(other.value, this) : other;
  };

  //# Maybe#fantasy-land/chain :: Maybe a ~> (a -> Maybe b) -> Maybe b
  //.
  //. Takes a function and returns `this` if `this` is Nothing; otherwise
  //. it returns the result of applying the function to this Just's value.
  //.
  //. It is idiomatic to use [`chain`](#chain) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.chain(S.parseFloat, S.Nothing)
  //. Nothing
  //.
  //. > S.chain(S.parseFloat, S.Just('xxx'))
  //. Nothing
  //.
  //. > S.chain(S.parseFloat, S.Just('12.34'))
  //. Just(12.34)
  //. ```
  Maybe.prototype['fantasy-land/chain'] = function(f) {
    return this.isJust ? f(this.value) : this;
  };

  //# Maybe#fantasy-land/alt :: Maybe a ~> Maybe a -> Maybe a
  //.
  //. Chooses between `this` and the other Maybe provided as an argument.
  //. Returns `this` if `this` is a Just; the other Maybe otherwise.
  //.
  //. It is idiomatic to use [`alt`](#alt) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.alt(S.Nothing, S.Nothing)
  //. Nothing
  //.
  //. > S.alt(S.Nothing, S.Just(1))
  //. Just(1)
  //.
  //. > S.alt(S.Just(2), S.Nothing)
  //. Just(2)
  //.
  //. > S.alt(S.Just(3), S.Just(4))
  //. Just(3)
  //. ```
  Maybe.prototype['fantasy-land/alt'] = function(other) {
    return this.isJust ? this : other;
  };

  //# Maybe#fantasy-land/reduce :: Maybe a ~> ((b, a) -> b, b) -> b
  //.
  //. Takes a function and an initial value of any type, and returns:
  //.
  //.   - the initial value if `this` is Nothing; otherwise
  //.
  //.   - the result of applying the function to the initial value and this
  //.     Just's value.
  //.
  //. It is idiomatic to use [`reduce`](#reduce) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.reduce(S.curry2(Math.pow), 10, S.Nothing)
  //. 10
  //.
  //. > S.reduce(S.curry2(Math.pow), 10, S.Just(3))
  //. 1000
  //. ```
  Maybe.prototype['fantasy-land/reduce'] = function(f, x) {
    return this.isJust ? f(x, this.value) : x;
  };

  //# Maybe#fantasy-land/traverse :: Applicative f => Maybe a ~> (TypeRep f, a -> f b) -> f (Maybe b)
  //.
  //. Takes the type representative of some [Applicative][] and a function
  //. which returns a value of that Applicative, and returns:
  //.
  //.   - the result of applying the type representative's [`of`][] function to
  //.     `this` if `this` is Nothing; otherwise
  //.
  //.   - the result of mapping [`Just`](#Just) over the result of applying the
  //.     first function to this Just's value.
  //.
  //. It is idiomatic to use [`traverse`](#traverse) rather than use this
  //. method directly.
  //.
  //. ```javascript
  //. > S.traverse(Array, S.words, S.Nothing)
  //. [Nothing]
  //.
  //. > S.traverse(Array, S.words, S.Just('foo bar baz'))
  //. [Just('foo'), Just('bar'), Just('baz')]
  //. ```
  Maybe.prototype['fantasy-land/traverse'] = function(typeRep, f) {
    return this.isJust ? Z.map(Just, f(this.value)) : Z.of(typeRep, this);
  };

  //# Maybe#fantasy-land/extend :: Maybe a ~> (Maybe a -> b) -> Maybe b
  //.
  //. Takes a function and returns `this` if `this` is Nothing; otherwise
  //. it returns a Just whose value is the result of applying the function
  //. to `this`.
  //.
  //. It is idiomatic to use [`extend`](#extend) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.extend(x => x.value + 1, S.Nothing)
  //. Nothing
  //.
  //. > S.extend(x => x.value + 1, S.Just(42))
  //. Just(43)
  //. ```
  Maybe.prototype['fantasy-land/extend'] = function(f) {
    return this.isJust ? Just(f(this)) : this;
  };

  //# isNothing :: Maybe a -> Boolean
  //.
  //. Returns `true` if the given Maybe is Nothing; `false` if it is a Just.
  //.
  //. ```javascript
  //. > S.isNothing(S.Nothing)
  //. true
  //.
  //. > S.isNothing(S.Just(42))
  //. false
  //. ```
  function isNothing(maybe) {
    return maybe.isNothing;
  }
  S.isNothing = def('isNothing', {}, [$Maybe(a), $.Boolean], isNothing);

  //# isJust :: Maybe a -> Boolean
  //.
  //. Returns `true` if the given Maybe is a Just; `false` if it is Nothing.
  //.
  //. ```javascript
  //. > S.isJust(S.Just(42))
  //. true
  //.
  //. > S.isJust(S.Nothing)
  //. false
  //. ```
  function isJust(maybe) {
    return maybe.isJust;
  }
  S.isJust = def('isJust', {}, [$Maybe(a), $.Boolean], isJust);

  //# fromMaybe :: a -> Maybe a -> a
  //.
  //. Takes a default value and a Maybe, and returns the Maybe's value
  //. if the Maybe is a Just; the default value otherwise.
  //.
  //. See also [`fromMaybe_`](#fromMaybe_) and
  //. [`maybeToNullable`](#maybeToNullable).
  //.
  //. ```javascript
  //. > S.fromMaybe(0, S.Just(42))
  //. 42
  //.
  //. > S.fromMaybe(0, S.Nothing)
  //. 0
  //. ```
  function fromMaybe(x, maybe) {
    return maybe.isJust ? maybe.value : x;
  }
  S.fromMaybe = def('fromMaybe', {}, [a, $Maybe(a), a], fromMaybe);

  //# fromMaybe_ :: (() -> a) -> Maybe a -> a
  //.
  //. Variant of [`fromMaybe`](#fromMaybe) which takes a thunk so the default
  //. value is only computed if required.
  //.
  //. ```javascript
  //. > function fib(n) { return n <= 1 ? n : fib(n - 2) + fib(n - 1); }
  //.
  //. > S.fromMaybe_(() => fib(30), S.Just(1000000))
  //. 1000000
  //.
  //. > S.fromMaybe_(() => fib(30), S.Nothing)
  //. 832040
  //. ```
  function fromMaybe_(thunk, maybe) {
    return maybe.isJust ? maybe.value : thunk();
  }
  S.fromMaybe_ = def('fromMaybe_', {}, [$.Thunk(a), $Maybe(a), a], fromMaybe_);

  //# maybeToNullable :: Maybe a -> Nullable a
  //.
  //. Returns the given Maybe's value if the Maybe is a Just; `null` otherwise.
  //. [Nullable][] is defined in [sanctuary-def][].
  //.
  //. See also [`fromMaybe`](#fromMaybe).
  //.
  //. ```javascript
  //. > S.maybeToNullable(S.Just(42))
  //. 42
  //.
  //. > S.maybeToNullable(S.Nothing)
  //. null
  //. ```
  function maybeToNullable(maybe) {
    return maybe.isJust ? maybe.value : null;
  }
  S.maybeToNullable =
  def('maybeToNullable', {}, [$Maybe(a), $.Nullable(a)], maybeToNullable);

  //# toMaybe :: a? -> Maybe a
  //.
  //. Takes a value and returns Nothing if the value is `null` or `undefined`;
  //. Just the value otherwise.
  //.
  //. ```javascript
  //. > S.toMaybe(null)
  //. Nothing
  //.
  //. > S.toMaybe(42)
  //. Just(42)
  //. ```
  function toMaybe(x) {
    return x == null ? Nothing : Just(x);
  }
  S.toMaybe = def('toMaybe', {}, [a, $Maybe(a)], toMaybe);

  //# maybe :: b -> (a -> b) -> Maybe a -> b
  //.
  //. Takes a value of any type, a function, and a Maybe. If the Maybe is
  //. a Just, the return value is the result of applying the function to
  //. the Just's value. Otherwise, the first argument is returned.
  //.
  //. See also [`maybe_`](#maybe_).
  //.
  //. ```javascript
  //. > S.maybe(0, S.prop('length'), S.Just('refuge'))
  //. 6
  //.
  //. > S.maybe(0, S.prop('length'), S.Nothing)
  //. 0
  //. ```
  function maybe(x, f, maybe) {
    return fromMaybe(x, Z.map(f, maybe));
  }
  S.maybe = def('maybe', {}, [b, Fn(a, b), $Maybe(a), b], maybe);

  //# maybe_ :: (() -> b) -> (a -> b) -> Maybe a -> b
  //.
  //. Variant of [`maybe`](#maybe) which takes a thunk so the default value
  //. is only computed if required.
  //.
  //. ```javascript
  //. > function fib(n) { return n <= 1 ? n : fib(n - 2) + fib(n - 1); }
  //.
  //. > S.maybe_(() => fib(30), Math.sqrt, S.Just(1000000))
  //. 1000
  //.
  //. > S.maybe_(() => fib(30), Math.sqrt, S.Nothing)
  //. 832040
  //. ```
  function maybe_(thunk, f, maybe) {
    return maybe.isJust ? f(maybe.value) : thunk();
  }
  S.maybe_ = def('maybe_', {}, [$.Thunk(b), Fn(a, b), $Maybe(a), b], maybe_);

  //# justs :: Array (Maybe a) -> Array a
  //.
  //. Takes an array of Maybes and returns an array containing each Just's
  //. value. Equivalent to Haskell's `catMaybes` function.
  //.
  //. See also [`lefts`](#lefts) and [`rights`](#rights).
  //.
  //. ```javascript
  //. > S.justs([S.Just('foo'), S.Nothing, S.Just('baz')])
  //. ['foo', 'baz']
  //. ```
  function justs(maybes) {
    return Z.reduce(function(xs, maybe) {
      if (maybe.isJust) xs.push(maybe.value);
      return xs;
    }, [], maybes);
  }
  S.justs = def('justs', {}, [$.Array($Maybe(a)), $.Array(a)], justs);

  //# mapMaybe :: (a -> Maybe b) -> Array a -> Array b
  //.
  //. Takes a function and an array, applies the function to each element of
  //. the array, and returns an array of "successful" results. If the result of
  //. applying the function to an element of the array is Nothing, the result
  //. is discarded; if the result is a Just, the Just's value is included in
  //. the output array.
  //.
  //. In general terms, `mapMaybe` filters an array while mapping over it.
  //.
  //. ```javascript
  //. > S.mapMaybe(S.head, [[], [1, 2, 3], [], [4, 5, 6], []])
  //. [1, 4]
  //. ```
  function mapMaybe(f, xs) {
    return justs(Z.map(f, xs));
  }
  S.mapMaybe =
  def('mapMaybe', {}, [Fn(a, $Maybe(b)), $.Array(a), $.Array(b)], mapMaybe);

  //# encase :: (a -> b) -> a -> Maybe b
  //.
  //. Takes a unary function `f` which may throw and a value `x` of any type,
  //. and applies `f` to `x` inside a `try` block. If an exception is caught,
  //. the return value is Nothing; otherwise the return value is Just the
  //. result of applying `f` to `x`.
  //.
  //. See also [`encaseEither`](#encaseEither).
  //.
  //. ```javascript
  //. > S.encase(eval, '1 + 1')
  //. Just(2)
  //.
  //. > S.encase(eval, '1 +')
  //. Nothing
  //. ```
  function encase(f, x) {
    try {
      return Just(f(x));
    } catch (err) {
      return Nothing;
    }
  }
  S.encase = def('encase', {}, [Fn(a, b), a, $Maybe(b)], encase);

  //# encase2 :: (a -> b -> c) -> a -> b -> Maybe c
  //.
  //. Binary version of [`encase`](#encase).
  function encase2(f, x, y) {
    try {
      return Just(f(x)(y));
    } catch (err) {
      return Nothing;
    }
  }
  S.encase2 = def('encase2', {}, [Fn(a, Fn(b, c)), a, b, $Maybe(c)], encase2);

  //# encase3 :: (a -> b -> c -> d) -> a -> b -> c -> Maybe d
  //.
  //. Ternary version of [`encase`](#encase).
  function encase3(f, x, y, z) {
    try {
      return Just(f(x)(y)(z));
    } catch (err) {
      return Nothing;
    }
  }
  S.encase3 =
  def('encase3', {}, [Fn(a, Fn(b, Fn(c, d))), a, b, c, $Maybe(d)], encase3);

  //# maybeToEither :: a -> Maybe b -> Either a b
  //.
  //. Converts a Maybe to an Either. Nothing becomes a Left (containing the
  //. first argument); a Just becomes a Right.
  //.
  //. See also [`eitherToMaybe`](#eitherToMaybe).
  //.
  //. ```javascript
  //. > S.maybeToEither('Expecting an integer', S.parseInt(10, 'xyz'))
  //. Left('Expecting an integer')
  //.
  //. > S.maybeToEither('Expecting an integer', S.parseInt(10, '42'))
  //. Right(42)
  //. ```
  function maybeToEither(x, maybe) {
    return maybe.isNothing ? Left(x) : Right(maybe.value);
  }
  S.maybeToEither =
  def('maybeToEither', {}, [a, $Maybe(b), $Either(a, b)], maybeToEither);

  //. ### Either type
  //.
  //. The Either type represents values with two possibilities: a value of type
  //. `Either a b` is either a Left whose value is of type `a` or a Right whose
  //. value is of type `b`.
  //.
  //. The Either type satisfies the [Ord][], [Semigroup][], [Monad][],
  //. [Alt][], [Traversable][], [Extend][], and [Bifunctor][] specifications.

  //# EitherType :: Type -> Type -> Type
  //.
  //. A [`BinaryType`][BinaryType] for use with [sanctuary-def][].
  S.EitherType = $Either;

  //# Either :: TypeRep Either
  //.
  //. The [type representative](#type-representatives) for the Either type.
  var Either = S.Either = {prototype: _Either.prototype};

  Either.prototype.constructor = Either;

  function _Either(tag, value) {
    this.isLeft = tag === 'Left';
    this.isRight = tag === 'Right';
    this.value = value;

    //  Add "fantasy-land/concat" method conditionally so that Left('abc')
    //  and Right('abc') satisfy the requirements of Semigroup but Left(123)
    //  and Right(123) do not.
    if (Z.Semigroup.test(this.value)) {
      this['fantasy-land/concat'] = Either$prototype$concat;
    }

    if (Z.Setoid.test(this.value)) {
      this['fantasy-land/equals'] = Either$prototype$equals;
    }

    if (Z.Ord.test(this.value)) {
      this['fantasy-land/lte'] = Either$prototype$lte;
    }
  }

  //# Left :: a -> Either a b
  //.
  //. Takes a value of any type and returns a Left with the given value.
  //.
  //. ```javascript
  //. > S.Left('Cannot divide by zero')
  //. Left('Cannot divide by zero')
  //. ```
  function Left(x) {
    return new _Either('Left', x);
  }
  S.Left = def('Left', {}, [a, $Either(a, b)], Left);

  //# Right :: b -> Either a b
  //.
  //. Takes a value of any type and returns a Right with the given value.
  //.
  //. ```javascript
  //. > S.Right(42)
  //. Right(42)
  //. ```
  function Right(x) {
    return new _Either('Right', x);
  }
  S.Right = def('Right', {}, [b, $Either(a, b)], Right);

  //# Either.@@type :: String
  //.
  //. Either type identifier, `'sanctuary/Either'`.
  Either['@@type'] = eitherTypeIdent;

  //# Either.fantasy-land/of :: b -> Either a b
  //.
  //. Takes a value of any type and returns a Right with the given value.
  //.
  //. It is idiomatic to use [`of`](#of) rather than use this function
  //. directly.
  //.
  //. ```javascript
  //. > S.of(S.Either, 42)
  //. Right(42)
  //. ```
  Either['fantasy-land/of'] = Right;

  //# Either#isLeft :: Either a b ~> Boolean
  //.
  //. `true` if `this` is a Left; `false` if `this` is a Right.
  //.
  //. ```javascript
  //. > S.Left('Cannot divide by zero').isLeft
  //. true
  //.
  //. > S.Right(42).isLeft
  //. false
  //. ```

  //# Either#isRight :: Either a b ~> Boolean
  //.
  //. `true` if `this` is a Right; `false` if `this` is a Left.
  //.
  //. ```javascript
  //. > S.Right(42).isRight
  //. true
  //.
  //. > S.Left('Cannot divide by zero').isRight
  //. false
  //. ```

  //# Either#toString :: Either a b ~> () -> String
  //.
  //. Returns the string representation of the Either.
  //.
  //. ```javascript
  //. > S.toString(S.Left('Cannot divide by zero'))
  //. 'Left("Cannot divide by zero")'
  //.
  //. > S.toString(S.Right([1, 2, 3]))
  //. 'Right([1, 2, 3])'
  //. ```
  Either.prototype.toString = function() {
    return (this.isLeft ? 'Left' : 'Right') +
           '(' + Z.toString(this.value) + ')';
  };

  //# Either#inspect :: Either a b ~> () -> String
  //.
  //. Returns the string representation of the Either. This method is used by
  //. `util.inspect` and the REPL to format a Either for display.
  //.
  //. See also [`Either#toString`][].
  //.
  //. ```javascript
  //. > S.Left('Cannot divide by zero').inspect()
  //. 'Left("Cannot divide by zero")'
  //.
  //. > S.Right([1, 2, 3]).inspect()
  //. 'Right([1, 2, 3])'
  //. ```
  Either.prototype.inspect = function() { return this.toString(); };

  //# Either#fantasy-land/equals :: (Setoid a, Setoid b) => Either a b ~> Either a b -> Boolean
  //.
  //. Takes a value `e` of the same type and returns `true` if:
  //.
  //.   - `this` and `e` are both Lefts or both Rights, and their values are
  //.     equal according to [`Z.equals`][].
  //.
  //. It is idiomatic to use [`equals`](#equals) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.equals(S.Right([1, 2, 3]), S.Right([1, 2, 3]))
  //. true
  //.
  //. > S.equals(S.Right([1, 2, 3]), S.Left([1, 2, 3]))
  //. false
  //. ```
  function Either$prototype$equals(other) {
    return this.isLeft === other.isLeft && Z.equals(this.value, other.value);
  }

  //# Either#fantasy-land/lte :: (Ord a, Ord b) => Either a b ~> Either a b -> Boolean
  //.
  //. Takes a value `e` of the same type and returns `true` if:
  //.
  //.   - `this` is a Left and `e` is a Right; or
  //.
  //.   - `this` and `e` are both Lefts or both Rights, and the value of `this`
  //.     is less than or equal to the value of `e` according to [`Z.lte`][].
  //.
  //. It is idiomatic to use [`lte`](#lte) or [`lte_`](#lte_) rather than use
  //. this method directly.
  //.
  //. ```javascript
  //. > S.lte_(S.Left(10), S.Right(0))
  //. true
  //.
  //. > S.lte_(S.Right(0), S.Left(10))
  //. false
  //.
  //. > S.lte_(S.Right(0), S.Right(1))
  //. true
  //.
  //. > S.lte_(S.Right(1), S.Right(0))
  //. false
  //. ```
  function Either$prototype$lte(other) {
    return this.isLeft === other.isLeft ?
      Z.lte(this.value, other.value) :
      this.isLeft;
  }

  //# Either#fantasy-land/concat :: (Semigroup a, Semigroup b) => Either a b ~> Either a b -> Either a b
  //.
  //. Returns the result of concatenating two Either values of the same type.
  //. `a` must have a [Semigroup][], as must `b`.
  //.
  //. If `this` is a Left and the argument is a Left, this method returns a
  //. Left whose value is the result of concatenating this Left's value and
  //. the given Left's value.
  //.
  //. If `this` is a Right and the argument is a Right, this method returns a
  //. Right whose value is the result of concatenating this Right's value and
  //. the given Right's value.
  //.
  //. Otherwise, this method returns the Right.
  //.
  //. It is idiomatic to use [`concat`](#concat) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.concat(S.Left('abc'), S.Left('def'))
  //. Left('abcdef')
  //.
  //. > S.concat(S.Right([1, 2, 3]), S.Right([4, 5, 6]))
  //. Right([1, 2, 3, 4, 5, 6])
  //.
  //. > S.concat(S.Left('abc'), S.Right([1, 2, 3]))
  //. Right([1, 2, 3])
  //.
  //. > S.concat(S.Right([1, 2, 3]), S.Left('abc'))
  //. Right([1, 2, 3])
  //. ```
  function Either$prototype$concat(other) {
    return this.isLeft ?
      other.isLeft ? Left(Z.concat(this.value, other.value)) : other :
      other.isLeft ? this : Right(Z.concat(this.value, other.value));
  }

  //# Either#fantasy-land/map :: Either a b ~> (b -> c) -> Either a c
  //.
  //. Takes a function and returns `this` if `this` is a Left; otherwise it
  //. returns a Right whose value is the result of applying the function to
  //. this Right's value.
  //.
  //. It is idiomatic to use [`map`](#map) rather than use this method
  //. directly.
  //.
  //. See also [`Either#fantasy-land/bimap`][].
  //.
  //. ```javascript
  //. > S.map(Math.sqrt, S.Left('Cannot divide by zero'))
  //. Left('Cannot divide by zero')
  //.
  //. > S.map(Math.sqrt, S.Right(9))
  //. Right(3)
  //. ```
  Either.prototype['fantasy-land/map'] = function(f) {
    return this.isRight ? Right(f(this.value)) : this;
  };

  //# Either#fantasy-land/bimap :: Either a b ~> (a -> c, b -> d) -> Either c d
  //.
  //. Takes two functions and returns:
  //.
  //.   - a Left whose value is the result of applying the first function
  //.     to this Left's value if `this` is a Left; otherwise
  //.
  //.   - a Right whose value is the result of applying the second function
  //.     to this Right's value.
  //.
  //. Similar to [`Either#fantasy-land/map`][], but supports mapping over the
  //. left side as well as the right side.
  //.
  //. It is idiomatic to use [`bimap`](#bimap) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.bimap(S.toUpper, S.add(1), S.Left('abc'))
  //. Left('ABC')
  //.
  //. > S.bimap(S.toUpper, S.add(1), S.Right(42))
  //. Right(43)
  //. ```
  Either.prototype['fantasy-land/bimap'] = function(f, g) {
    return this.isLeft ? Left(f(this.value)) : Right(g(this.value));
  };

  //# Either#fantasy-land/ap :: Either a b ~> Either a (b -> c) -> Either a c
  //.
  //. Takes an Either and returns a Left unless `this` is a Right *and* the
  //. argument is a Right, in which case it returns a Right whose value is
  //. the result of applying the given Right's value to this Right's value.
  //.
  //. It is idiomatic to use [`ap`](#ap) rather than use this method directly.
  //.
  //. ```javascript
  //. > S.ap(S.Left('No such function'), S.Left('Cannot divide by zero'))
  //. Left('No such function')
  //.
  //. > S.ap(S.Left('No such function'), S.Right(9))
  //. Left('No such function')
  //.
  //. > S.ap(S.Right(Math.sqrt), S.Left('Cannot divide by zero'))
  //. Left('Cannot divide by zero')
  //.
  //. > S.ap(S.Right(Math.sqrt), S.Right(9))
  //. Right(3)
  //. ```
  Either.prototype['fantasy-land/ap'] = function(other) {
    return other.isRight ? Z.map(other.value, this) : other;
  };

  //# Either#fantasy-land/chain :: Either a b ~> (b -> Either a c) -> Either a c
  //.
  //. Takes a function and returns `this` if `this` is a Left; otherwise
  //. it returns the result of applying the function to this Right's value.
  //.
  //. It is idiomatic to use [`chain`](#chain) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > global.sqrt = n =>
  //. .   n < 0 ? S.Left('Cannot represent square root of negative number')
  //. .         : S.Right(Math.sqrt(n))
  //. sqrt
  //.
  //. > S.chain(sqrt, S.Left('Cannot divide by zero'))
  //. Left('Cannot divide by zero')
  //.
  //. > S.chain(sqrt, S.Right(-1))
  //. Left('Cannot represent square root of negative number')
  //.
  //. > S.chain(sqrt, S.Right(25))
  //. Right(5)
  //. ```
  Either.prototype['fantasy-land/chain'] = function(f) {
    return this.isRight ? f(this.value) : this;
  };

  //# Either#fantasy-land/alt :: Either a b ~> Either a b -> Either a b
  //.
  //. Chooses between `this` and the other Either provided as an argument.
  //. Returns `this` if `this` is a Right; the other Either otherwise.
  //.
  //. It is idiomatic to use [`alt`](#alt) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.alt(S.Left('A'), S.Left('B'))
  //. Left('B')
  //.
  //. > S.alt(S.Left('C'), S.Right(1))
  //. Right(1)
  //.
  //. > S.alt(S.Right(2), S.Left('D'))
  //. Right(2)
  //.
  //. > S.alt(S.Right(3), S.Right(4))
  //. Right(3)
  //. ```
  Either.prototype['fantasy-land/alt'] = function(other) {
    return this.isRight ? this : other;
  };

  //# Either#fantasy-land/reduce :: Either a b ~> ((c, b) -> c, c) -> c
  //.
  //. Takes a function and an initial value of any type, and returns:
  //.
  //.   - the initial value if `this` is a Left; otherwise
  //.
  //.   - the result of applying the function to the initial value and this
  //.     Right's value.
  //.
  //. It is idiomatic to use [`reduce`](#reduce) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.reduce(S.curry2(Math.pow), 10, S.Left('Cannot divide by zero'))
  //. 10
  //.
  //. > S.reduce(S.curry2(Math.pow), 10, S.Right(3))
  //. 1000
  //. ```
  Either.prototype['fantasy-land/reduce'] = function(f, x) {
    return this.isRight ? f(x, this.value) : x;
  };

  //# Either#fantasy-land/traverse :: Applicative f => Either a b ~> (TypeRep f, b -> f c) -> f (Either a c)
  //.
  //. Takes the type representative of some [Applicative][] and a function
  //. which returns a value of that Applicative, and returns:
  //.
  //.   - the result of applying the type representative's [`of`][] function to
  //.     `this` if `this` is a Left; otherwise
  //.
  //.   - the result of mapping [`Right`](#Right) over the result of applying
  //.     the first function to this Right's value.
  //.
  //. It is idiomatic to use [`traverse`](#traverse) rather than use this
  //. method directly.
  //.
  //. ```javascript
  //. > S.traverse(Array, S.words, S.Left('Request failed'))
  //. [Left('Request failed')]
  //.
  //. > S.traverse(Array, S.words, S.Right('foo bar baz'))
  //. [Right('foo'), Right('bar'), Right('baz')]
  //. ```
  Either.prototype['fantasy-land/traverse'] = function(typeRep, f) {
    return this.isRight ? Z.map(Right, f(this.value)) : Z.of(typeRep, this);
  };

  //# Either#fantasy-land/extend :: Either a b ~> (Either a b -> c) -> Either a c
  //.
  //. Takes a function and returns `this` if `this` is a Left; otherwise it
  //. returns a Right whose value is the result of applying the function to
  //. `this`.
  //.
  //. It is idiomatic to use [`extend`](#extend) rather than use this method
  //. directly.
  //.
  //. ```javascript
  //. > S.extend(x => x.value + 1, S.Left('Cannot divide by zero'))
  //. Left('Cannot divide by zero')
  //.
  //. > S.extend(x => x.value + 1, S.Right(42))
  //. Right(43)
  //. ```
  Either.prototype['fantasy-land/extend'] = function(f) {
    return this.isLeft ? this : Right(f(this));
  };

  //# isLeft :: Either a b -> Boolean
  //.
  //. Returns `true` if the given Either is a Left; `false` if it is a Right.
  //.
  //. ```javascript
  //. > S.isLeft(S.Left('Cannot divide by zero'))
  //. true
  //.
  //. > S.isLeft(S.Right(42))
  //. false
  //. ```
  function isLeft(either) {
    return either.isLeft;
  }
  S.isLeft = def('isLeft', {}, [$Either(a, b), $.Boolean], isLeft);

  //# isRight :: Either a b -> Boolean
  //.
  //. Returns `true` if the given Either is a Right; `false` if it is a Left.
  //.
  //. ```javascript
  //. > S.isRight(S.Right(42))
  //. true
  //.
  //. > S.isRight(S.Left('Cannot divide by zero'))
  //. false
  //. ```
  function isRight(either) {
    return either.isRight;
  }
  S.isRight = def('isRight', {}, [$Either(a, b), $.Boolean], isRight);

  //# fromEither :: b -> Either a b -> b
  //.
  //. Takes a default value and an Either, and returns the Right value
  //. if the Either is a Right; the default value otherwise.
  //.
  //. ```javascript
  //. > S.fromEither(0, S.Right(42))
  //. 42
  //.
  //. > S.fromEither(0, S.Left(42))
  //. 0
  //. ```
  function fromEither(x, either) {
    return either.isRight ? either.value : x;
  }
  S.fromEither = def('fromEither', {}, [b, $Either(a, b), b], fromEither);

  //# toEither :: a -> b? -> Either a b
  //.
  //. Converts an arbitrary value to an Either: a Left if the value is `null`
  //. or `undefined`; a Right otherwise. The first argument specifies the
  //. value of the Left in the "failure" case.
  //.
  //. ```javascript
  //. > S.toEither('XYZ', null)
  //. Left('XYZ')
  //.
  //. > S.toEither('XYZ', 'ABC')
  //. Right('ABC')
  //.
  //. > S.map(S.prop('0'), S.toEither('Invalid protocol', 'ftp://example.com/'.match(/^https?:/)))
  //. Left('Invalid protocol')
  //.
  //. > S.map(S.prop('0'), S.toEither('Invalid protocol', 'https://example.com/'.match(/^https?:/)))
  //. Right('https:')
  //. ```
  function toEither(x, y) {
    return y == null ? Left(x) : Right(y);
  }
  S.toEither = def('toEither', {}, [a, b, $Either(a, b)], toEither);

  //# either :: (a -> c) -> (b -> c) -> Either a b -> c
  //.
  //. Takes two functions and an Either, and returns the result of
  //. applying the first function to the Left's value, if the Either
  //. is a Left, or the result of applying the second function to the
  //. Right's value, if the Either is a Right.
  //.
  //. ```javascript
  //. > S.either(S.toUpper, S.toString, S.Left('Cannot divide by zero'))
  //. 'CANNOT DIVIDE BY ZERO'
  //.
  //. > S.either(S.toUpper, S.toString, S.Right(42))
  //. '42'
  //. ```
  function either(l, r, either) {
    return either.isLeft ? l(either.value) : r(either.value);
  }
  S.either = def('either', {}, [Fn(a, c), Fn(b, c), $Either(a, b), c], either);

  //# lefts :: Array (Either a b) -> Array a
  //.
  //. Takes an array of Eithers and returns an array containing each Left's
  //. value.
  //.
  //. See also [`rights`](#rights).
  //.
  //. ```javascript
  //. > S.lefts([S.Right(20), S.Left('foo'), S.Right(10), S.Left('bar')])
  //. ['foo', 'bar']
  //. ```
  function lefts(eithers) {
    return Z.reduce(function(xs, either) {
      if (either.isLeft) xs.push(either.value);
      return xs;
    }, [], eithers);
  }
  S.lefts = def('lefts', {}, [$.Array($Either(a, b)), $.Array(a)], lefts);

  //# rights :: Array (Either a b) -> Array b
  //.
  //. Takes an array of Eithers and returns an array containing each Right's
  //. value.
  //.
  //. See also [`lefts`](#lefts).
  //.
  //. ```javascript
  //. > S.rights([S.Right(20), S.Left('foo'), S.Right(10), S.Left('bar')])
  //. [20, 10]
  //. ```
  function rights(eithers) {
    return Z.reduce(function(xs, either) {
      if (either.isRight) xs.push(either.value);
      return xs;
    }, [], eithers);
  }
  S.rights = def('rights', {}, [$.Array($Either(a, b)), $.Array(b)], rights);

  //# tagBy :: (a -> Boolean) -> a -> Either a a
  //.
  //. Takes a predicate and a value, and returns a Right of the value if it
  //. satisfies the predicate; a Left of the value otherwise.
  //.
  //. ```javascript
  //. > S.tagBy(S.odd, 0)
  //. Left(0)
  //
  //. > S.tagBy(S.odd, 1)
  //. Right(1)
  //. ```
  function tagBy(pred, a) {
    return pred(a) ? Right(a) : Left(a);
  }
  S.tagBy = def('tagBy', {}, [$.Predicate(a), a, $Either(a, a)], tagBy);

  //# encaseEither :: (Error -> l) -> (a -> r) -> a -> Either l r
  //.
  //. Takes two unary functions, `f` and `g`, the second of which may throw,
  //. and a value `x` of any type. Applies `g` to `x` inside a `try` block.
  //. If an exception is caught, the return value is a Left containing the
  //. result of applying `f` to the caught Error object; otherwise the return
  //. value is a Right containing the result of applying `g` to `x`.
  //.
  //. See also [`encase`](#encase).
  //.
  //. ```javascript
  //. > S.encaseEither(S.I, JSON.parse, '["foo","bar","baz"]')
  //. Right(['foo', 'bar', 'baz'])
  //.
  //. > S.encaseEither(S.I, JSON.parse, '[')
  //. Left(new SyntaxError('Unexpected end of JSON input'))
  //.
  //. > S.encaseEither(S.prop('message'), JSON.parse, '[')
  //. Left('Unexpected end of JSON input')
  //. ```
  function encaseEither(f, g, x) {
    try {
      return Right(g(x));
    } catch (err) {
      return Left(f(err));
    }
  }
  S.encaseEither =
  def('encaseEither',
      {},
      [Fn($.Error, l), Fn(a, r), a, $Either(l, r)],
      encaseEither);

  //# encaseEither2 :: (Error -> l) -> (a -> b -> r) -> a -> b -> Either l r
  //.
  //. Binary version of [`encaseEither`](#encaseEither).
  function encaseEither2(f, g, x, y) {
    try {
      return Right(g(x)(y));
    } catch (err) {
      return Left(f(err));
    }
  }
  S.encaseEither2 =
  def('encaseEither2',
      {},
      [Fn($.Error, l), Fn(a, Fn(b, r)), a, b, $Either(l, r)],
      encaseEither2);

  //# encaseEither3 :: (Error -> l) -> (a -> b -> c -> r) -> a -> b -> c -> Either l r
  //.
  //. Ternary version of [`encaseEither`](#encaseEither).
  function encaseEither3(f, g, x, y, z) {
    try {
      return Right(g(x)(y)(z));
    } catch (err) {
      return Left(f(err));
    }
  }
  S.encaseEither3 =
  def('encaseEither3',
      {},
      [Fn($.Error, l), Fn(a, Fn(b, Fn(c, r))), a, b, c, $Either(l, r)],
      encaseEither3);

  //# eitherToMaybe :: Either a b -> Maybe b
  //.
  //. Converts an Either to a Maybe. A Left becomes Nothing; a Right becomes
  //. a Just.
  //.
  //. See also [`maybeToEither`](#maybeToEither).
  //.
  //. ```javascript
  //. > S.eitherToMaybe(S.Left('Cannot divide by zero'))
  //. Nothing
  //.
  //. > S.eitherToMaybe(S.Right(42))
  //. Just(42)
  //. ```
  function eitherToMaybe(either) {
    return either.isLeft ? Nothing : Just(either.value);
  }
  S.eitherToMaybe =
  def('eitherToMaybe', {}, [$Either(a, b), $Maybe(b)], eitherToMaybe);

  //. ### Logic

  //# and :: Boolean -> Boolean -> Boolean
  //.
  //. Boolean "and".
  //.
  //. ```javascript
  //. > S.and(false, false)
  //. false
  //.
  //. > S.and(false, true)
  //. false
  //.
  //. > S.and(true, false)
  //. false
  //.
  //. > S.and(true, true)
  //. true
  //. ```
  function and(x, y) {
    return x.valueOf() && y.valueOf();
  }
  S.and = def('and', {}, [$.Boolean, $.Boolean, $.Boolean], and);

  //# or :: Boolean -> Boolean -> Boolean
  //.
  //. Boolean "or".
  //.
  //. ```javascript
  //. > S.or(false, false)
  //. false
  //.
  //. > S.or(false, true)
  //. true
  //.
  //. > S.or(true, false)
  //. true
  //.
  //. > S.or(true, true)
  //. true
  //. ```
  function or(x, y) {
    return x.valueOf() || y.valueOf();
  }
  S.or = def('or', {}, [$.Boolean, $.Boolean, $.Boolean], or);

  //# not :: Boolean -> Boolean
  //.
  //. Boolean "not".
  //.
  //. See also [`complement`](#complement).
  //.
  //. ```javascript
  //. > S.not(false)
  //. true
  //.
  //. > S.not(true)
  //. false
  //. ```
  function not(x) {
    return !x.valueOf();
  }
  S.not = def('not', {}, [$.Boolean, $.Boolean], not);

  //# complement :: (a -> Boolean) -> a -> Boolean
  //.
  //. Takes a unary predicate and a value of any type, and returns the logical
  //. negation of applying the predicate to the value.
  //.
  //. See also [`not`](#not).
  //.
  //. ```javascript
  //. > Number.isInteger(42)
  //. true
  //.
  //. > S.complement(Number.isInteger, 42)
  //. false
  //. ```
  function complement(pred, x) {
    return !pred(x);
  }
  S.complement =
  def('complement', {}, [$.Predicate(a), a, $.Boolean], complement);

  //# ifElse :: (a -> Boolean) -> (a -> b) -> (a -> b) -> a -> b
  //.
  //. Takes a unary predicate, a unary "if" function, a unary "else"
  //. function, and a value of any type, and returns the result of
  //. applying the "if" function to the value if the value satisfies
  //. the predicate; the result of applying the "else" function to the
  //. value otherwise.
  //.
  //. See also [`when`](#when) and [`unless`](#unless).
  //.
  //. ```javascript
  //. > S.ifElse(x => x < 0, Math.abs, Math.sqrt, -1)
  //. 1
  //.
  //. > S.ifElse(x => x < 0, Math.abs, Math.sqrt, 16)
  //. 4
  //. ```
  function ifElse(pred, f, g, x) {
    return pred(x) ? f(x) : g(x);
  }
  S.ifElse =
  def('ifElse', {}, [$.Predicate(a), Fn(a, b), Fn(a, b), a, b], ifElse);

  //# when :: (a -> Boolean) -> (a -> a) -> a -> a
  //.
  //. Takes a unary predicate, a unary function, and a value of any type, and
  //. returns the result of applying the function to the value if the value
  //. satisfies the predicate; the value otherwise.
  //.
  //. See also [`unless`](#unless) and [`ifElse`](#ifElse).
  //.
  //. ```javascript
  //. > S.when(x => x >= 0, Math.sqrt, 16)
  //. 4
  //.
  //. > S.when(x => x >= 0, Math.sqrt, -1)
  //. -1
  //. ```
  function when(pred, f, x) {
    return ifElse(pred, f, I, x);
  }
  S.when = def('when', {}, [$.Predicate(a), Fn(a, a), a, a], when);

  //# unless :: (a -> Boolean) -> (a -> a) -> a -> a
  //.
  //. Takes a unary predicate, a unary function, and a value of any type, and
  //. returns the result of applying the function to the value if the value
  //. does not satisfy the predicate; the value otherwise.
  //.
  //. See also [`when`](#when) and [`ifElse`](#ifElse).
  //.
  //. ```javascript
  //. > S.unless(x => x < 0, Math.sqrt, 16)
  //. 4
  //.
  //. > S.unless(x => x < 0, Math.sqrt, -1)
  //. -1
  //. ```
  function unless(pred, f, x) {
    return ifElse(pred, I, f, x);
  }
  S.unless = def('unless', {}, [$.Predicate(a), Fn(a, a), a, a], unless);

  //# allPass :: Foldable f => f (a -> Boolean) -> a -> Boolean
  //.
  //. Takes a structure containing zero or more predicates, and a value
  //. of any type. Returns `true` [iff][] the value satisfies all of the
  //. predicates. None of the subsequent predicates will be applied after
  //. the first predicate not satisfied.
  //.
  //. ```javascript
  //. > S.allPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'quiessence')
  //. true
  //.
  //. > S.allPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'fissiparous')
  //. false
  //. ```
  function allPass(preds, x) {
    return Z.reduce(function(b, p) { return b && p(x); }, true, preds);
  }
  S.allPass =
  def('allPass',
      {f: [Z.Foldable]},
      [f($.Predicate(a)), a, $.Boolean],
      allPass);

  //# anyPass :: Foldable f => f (a -> Boolean) -> a -> Boolean
  //.
  //. Takes a structure containing zero or more predicates, and a value
  //. of any type. Returns `true` [iff][] the value satisfies any of the
  //. predicates. None of the subsequent predicates will be applied after
  //. the first predicate satisfied.
  //.
  //. ```javascript
  //. > S.anyPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'incandescent')
  //. true
  //.
  //. > S.anyPass([S.test(/q/), S.test(/u/), S.test(/i/)], 'empathy')
  //. false
  //. ```
  function anyPass(preds, x) {
    return Z.reduce(function(b, p) { return b || p(x); }, false, preds);
  }
  S.anyPass =
  def('anyPass',
      {f: [Z.Foldable]},
      [f($.Predicate(a)), a, $.Boolean],
      anyPass);

  //. ### List
  //.
  //. The List type constructor enables type signatures to describe ad hoc
  //. polymorphic functions which operate on either [`Array`][$.Array] or
  //. [`String`][$.String] values.
  //.
  //. Mental gymnastics are required to treat arrays and strings similarly.
  //. `[1, 2, 3]` is a list containing `1`, `2`, and `3`. `'abc'` is a list
  //. containing `'a'`, `'b'`, and `'c'`. But what is the type of `'a'`?
  //. `String`, since JavaScript has no Char type! Thus:
  //.
  //.     'abc' :: String, List String, List (List String), ...
  //.
  //. Every member of `String` is also a member of `List String`!

  //# slice :: Integer -> Integer -> List a -> Maybe (List a)
  //.
  //. Returns Just a list containing the elements from the supplied list
  //. from a beginning index (inclusive) to an end index (exclusive).
  //. Returns Nothing unless the start interval is less than or equal to
  //. the end interval, and the list contains both (half-open) intervals.
  //. Accepts negative indices, which indicate an offset from the end of
  //. the list.
  //.
  //. See also [`take`](#take), [`drop`](#drop), [`takeLast`](#takeLast),
  //. and [`dropLast`](#dropLast).
  //.
  //. ```javascript
  //. > S.slice(1, 3, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['b', 'c'])
  //.
  //. > S.slice(-3, -1, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['c', 'd'])
  //.
  //. > S.slice(1, 6, ['a', 'b', 'c', 'd', 'e'])
  //. Nothing
  //.
  //. > S.slice(2, 6, 'banana')
  //. Just('nana')
  //. ```
  function slice(start, end, xs) {
    var len = xs.length;
    var fromIdx = start < 0 ? start + len : start;
    var toIdx = end < 0 ? end + len : end;

    return Math.abs(start) <= len && Math.abs(end) <= len && fromIdx <= toIdx ?
      Just(xs.slice(fromIdx, toIdx)) :
      Nothing;
  }
  S.slice =
  def('slice', {}, [$.Integer, $.Integer, List(a), $Maybe(List(a))], slice);

  //# at :: Integer -> List a -> Maybe a
  //.
  //. Takes an index and a list and returns Just the element of the list at
  //. the index if the index is within the list's bounds; Nothing otherwise.
  //. A negative index represents an offset from the length of the list.
  //.
  //. ```javascript
  //. > S.at(2, ['a', 'b', 'c', 'd', 'e'])
  //. Just('c')
  //.
  //. > S.at(5, ['a', 'b', 'c', 'd', 'e'])
  //. Nothing
  //.
  //. > S.at(-2, ['a', 'b', 'c', 'd', 'e'])
  //. Just('d')
  //. ```
  function at(n, xs) {
    var idx = n < 0 ? xs.length + n : n;
    return idx < 0 || idx >= xs.length ? Nothing : Just(xs[idx]);
  }
  S.at = def('at', {}, [$.Integer, List(a), $Maybe(a)], at);

  //# head :: List a -> Maybe a
  //.
  //. Takes a list and returns Just the first element of the list if the
  //. list contains at least one element; Nothing if the list is empty.
  //.
  //. ```javascript
  //. > S.head([1, 2, 3])
  //. Just(1)
  //.
  //. > S.head([])
  //. Nothing
  //. ```
  function head(xs) {
    return at(0, xs);
  }
  S.head = def('head', {}, [List(a), $Maybe(a)], head);

  //# last :: List a -> Maybe a
  //.
  //. Takes a list and returns Just the last element of the list if the
  //. list contains at least one element; Nothing if the list is empty.
  //.
  //. ```javascript
  //. > S.last([1, 2, 3])
  //. Just(3)
  //.
  //. > S.last([])
  //. Nothing
  //. ```
  function last(xs) {
    return at(-1, xs);
  }
  S.last = def('last', {}, [List(a), $Maybe(a)], last);

  //# tail :: List a -> Maybe (List a)
  //.
  //. Takes a list and returns Just a list containing all but the first
  //. of the list's elements if the list contains at least one element;
  //. Nothing if the list is empty.
  //.
  //. ```javascript
  //. > S.tail([1, 2, 3])
  //. Just([2, 3])
  //.
  //. > S.tail([])
  //. Nothing
  //. ```
  function tail(xs) {
    return xs.length > 0 ? Just(xs.slice(1)) : Nothing;
  }
  S.tail = def('tail', {}, [List(a), $Maybe(List(a))], tail);

  //# init :: List a -> Maybe (List a)
  //.
  //. Takes a list and returns Just a list containing all but the last
  //. of the list's elements if the list contains at least one element;
  //. Nothing if the list is empty.
  //.
  //. ```javascript
  //. > S.init([1, 2, 3])
  //. Just([1, 2])
  //.
  //. > S.init([])
  //. Nothing
  //. ```
  function init(xs) {
    return xs.length > 0 ? Just(xs.slice(0, -1)) : Nothing;
  }
  S.init = def('init', {}, [List(a), $Maybe(List(a))], init);

  //# take :: Integer -> List a -> Maybe (List a)
  //.
  //. Returns Just the first N elements of the given collection if N is
  //. greater than or equal to zero and less than or equal to the length
  //. of the collection; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.take(2, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['a', 'b'])
  //.
  //. > S.take(4, 'abcdefg')
  //. Just('abcd')
  //.
  //. > S.take(4, ['a', 'b', 'c'])
  //. Nothing
  //. ```
  function take(n, xs) {
    return n < 0 || n > xs.length ? Nothing : Just(xs.slice(0, n));
  }
  S.take = def('take', {}, [$.Integer, List(a), $Maybe(List(a))], take);

  //# takeLast :: Integer -> List a -> Maybe (List a)
  //.
  //. Returns Just the last N elements of the given collection if N is
  //. greater than or equal to zero and less than or equal to the length
  //. of the collection; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.takeLast(2, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['d', 'e'])
  //.
  //. > S.takeLast(4, 'abcdefg')
  //. Just('defg')
  //.
  //. > S.takeLast(4, ['a', 'b', 'c'])
  //. Nothing
  //. ```
  function takeLast(n, xs) {
    return n < 0 || n > xs.length ? Nothing : Just(xs.slice(xs.length - n));
  }
  S.takeLast =
  def('takeLast', {}, [$.Integer, List(a), $Maybe(List(a))], takeLast);

  //# drop :: Integer -> List a -> Maybe (List a)
  //.
  //. Returns Just all but the first N elements of the given collection
  //. if N is greater than or equal to zero and less than or equal to the
  //. length of the collection; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.drop(2, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['c', 'd', 'e'])
  //.
  //. > S.drop(4, 'abcdefg')
  //. Just('efg')
  //.
  //. > S.drop(4, 'abc')
  //. Nothing
  //. ```
  function drop(n, xs) {
    return n < 0 || n > xs.length ? Nothing : Just(xs.slice(n));
  }
  S.drop = def('drop', {}, [$.Integer, List(a), $Maybe(List(a))], drop);

  //# dropLast :: Integer -> List a -> Maybe (List a)
  //.
  //. Returns Just all but the last N elements of the given collection
  //. if N is greater than or equal to zero and less than or equal to the
  //. length of the collection; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.dropLast(2, ['a', 'b', 'c', 'd', 'e'])
  //. Just(['a', 'b', 'c'])
  //.
  //. > S.dropLast(4, 'abcdefg')
  //. Just('abc')
  //.
  //. > S.dropLast(4, 'abc')
  //. Nothing
  //. ```
  function dropLast(n, xs) {
    return n < 0 || n > xs.length ? Nothing : Just(xs.slice(0, xs.length - n));
  }
  S.dropLast =
  def('dropLast', {}, [$.Integer, List(a), $Maybe(List(a))], dropLast);

  //. ### Array

  //# size :: Foldable f => f a -> Integer
  //.
  //. Returns the number of elements of the given structure.
  //.
  //. ```javascript
  //. > S.size([])
  //. 0
  //.
  //. > S.size(['foo', 'bar', 'baz'])
  //. 3
  //.
  //. > S.size(Nil)
  //. 0
  //.
  //. > S.size(Cons('foo', Cons('bar', Cons('baz', Nil))))
  //. 3
  //.
  //. > S.size(S.Nothing)
  //. 0
  //.
  //. > S.size(S.Just('quux'))
  //. 1
  //. ```
  S.size = def('size', {f: [Z.Foldable]}, [f(a), $.Integer], Z.size);

  //# append :: (Applicative f, Semigroup (f a)) => a -> f a -> f a
  //.
  //. Returns the result of appending the first argument to the second.
  //.
  //. See also [`prepend`](#prepend).
  //.
  //. ```javascript
  //. > S.append(3, [1, 2])
  //. [1, 2, 3]
  //.
  //. > S.append(3, Cons(1, Cons(2, Nil)))
  //. Cons(1, Cons(2, Cons(3, Nil)))
  //.
  //. > S.append([1], S.Nothing)
  //. Just([1])
  //.
  //. > S.append([3], S.Just([1, 2]))
  //. Just([1, 2, 3])
  //. ```
  S.append =
  def('append',
      {f: [Z.Applicative, Z.Semigroup]},
      [a, f(a), f(a)],
      Z.append);

  //# prepend :: (Applicative f, Semigroup (f a)) => a -> f a -> f a
  //.
  //. Returns the result of prepending the first argument to the second.
  //.
  //. See also [`append`](#append).
  //.
  //. ```javascript
  //. > S.prepend(1, [2, 3])
  //. [1, 2, 3]
  //.
  //. > S.prepend(1, Cons(2, Cons(3, Nil)))
  //. Cons(1, Cons(2, Cons(3, Nil)))
  //.
  //. > S.prepend([1], S.Nothing)
  //. Just([1])
  //.
  //. > S.prepend([1], S.Just([2, 3]))
  //. Just([1, 2, 3])
  //. ```
  S.prepend =
  def('prepend',
      {f: [Z.Applicative, Z.Semigroup]},
      [a, f(a), f(a)],
      Z.prepend);

  //# joinWith :: String -> Array String -> String
  //.
  //. Joins the strings of the second argument separated by the first argument.
  //.
  //. Properties:
  //.
  //.   - `forall s :: String, t :: String. S.joinWith(s, S.splitOn(s, t)) = t`
  //.
  //. See also [`splitOn`](#splitOn).
  //.
  //. ```javascript
  //. > S.joinWith(':', ['foo', 'bar', 'baz'])
  //. 'foo:bar:baz'
  //. ```
  function joinWith(separator, ss) {
    return ss.join(separator);
  }
  S.joinWith =
  def('joinWith', {}, [$.String, $.Array($.String), $.String], joinWith);

  //# elem :: (Setoid a, Foldable f) => a -> f a -> Boolean
  //.
  //. Takes a value and a structure and returns `true` [iff][] the value is an
  //. element of the structure.
  //.
  //. See also [`find`](#find).
  //.
  //. ```javascript
  //. > S.elem('c', ['a', 'b', 'c'])
  //. true
  //.
  //. > S.elem('x', ['a', 'b', 'c'])
  //. false
  //.
  //. > S.elem(3, {x: 1, y: 2, z: 3})
  //. true
  //.
  //. > S.elem(8, {x: 1, y: 2, z: 3})
  //. false
  //.
  //. > S.elem(0, S.Just(0))
  //. true
  //.
  //. > S.elem(0, S.Just(1))
  //. false
  //.
  //. > S.elem(0, S.Nothing)
  //. false
  //. ```
  S.elem =
  def('elem', {a: [Z.Setoid], f: [Z.Foldable]}, [a, f(a), $.Boolean], Z.elem);

  //# find :: Foldable f => (a -> Boolean) -> f a -> Maybe a
  //.
  //. Takes a predicate and a structure and returns Just the leftmost element
  //. of the structure which satisfies the predicate; Nothing if there is no
  //. such element.
  //.
  //. See also [`elem`](#elem).
  //.
  //. ```javascript
  //. > S.find(n => n < 0, [1, -2, 3, -4, 5])
  //. Just(-2)
  //.
  //. > S.find(n => n < 0, [1, 2, 3, 4, 5])
  //. Nothing
  //. ```
  function find(pred, xs) {
    return Z.reduce(
      function(m, x) { return m.isJust ? m : pred(x) ? Just(x) : Nothing; },
      Nothing,
      xs
    );
  }
  S.find =
  def('find', {f: [Z.Foldable]}, [$.Predicate(a), f(a), $Maybe(a)], find);

  //# pluck :: Functor f => String -> f a -> f b
  //.
  //. Combines [`map`](#map) and [`prop`](#prop). `pluck(k, xs)` is equivalent
  //. to `map(prop(k), xs)`.
  //.
  //. ```javascript
  //. > S.pluck('x', [{x: 1}, {x: 2}, {x: 3}])
  //. [1, 2, 3]
  //.
  //. > S.pluck('x', S.Just({x: 1, y: 2, z: 3}))
  //. Just(1)
  //. ```
  function pluck(key, xs) {
    return Z.map(function(x) {
      var obj = toObject(x);
      if (key in obj) return obj[key];
      throw new TypeError('‘pluck’ expected object to have a property named ' +
                          '‘' + key + '’; ' + Z.toString(x) + ' does not');
    }, xs);
  }
  S.pluck = def('pluck', {f: [Z.Functor]}, [$.String, f(a), f(b)], pluck);

  //# unfoldr :: (b -> Maybe (Pair a b)) -> b -> Array a
  //.
  //. Takes a function and a seed value, and returns an array generated by
  //. applying the function repeatedly. The array is initially empty. The
  //. function is initially applied to the seed value. Each application
  //. of the function should result in either:
  //.
  //.   - Nothing, in which case the array is returned; or
  //.
  //.   - Just a pair, in which case the first element is appended to
  //.     the array and the function is applied to the second element.
  //.
  //. ```javascript
  //. > S.unfoldr(n => n < 5 ? S.Just([n, n + 1]) : S.Nothing, 1)
  //. [1, 2, 3, 4]
  //. ```
  function unfoldr(f, x) {
    var result = [];
    for (var m = f(x); m.isJust; m = f(m.value[1])) result.push(m.value[0]);
    return result;
  }
  S.unfoldr =
  def('unfoldr', {}, [Fn(b, $Maybe($.Pair(a, b))), b, $.Array(a)], unfoldr);

  //# range :: Integer -> Integer -> Array Integer
  //.
  //. Returns an array of consecutive integers starting with the first argument
  //. and ending with the second argument minus one. Returns `[]` if the second
  //. argument is less than or equal to the first argument.
  //.
  //. ```javascript
  //. > S.range(0, 10)
  //. [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  //.
  //. > S.range(-5, 0)
  //. [-5, -4, -3, -2, -1]
  //.
  //. > S.range(0, -5)
  //. []
  //. ```
  function range(from, to) {
    var result = [];
    for (var n = from; n < to; n += 1) result.push(n);
    return result;
  }
  S.range =
  def('range', {}, [$.Integer, $.Integer, $.Array($.Integer)], range);

  //# groupBy :: (a -> a -> Boolean) -> Array a -> Array (Array a)
  //.
  //. Splits its array argument into an array of arrays of equal,
  //. adjacent elements. Equality is determined by the function
  //. provided as the first argument. Its behaviour can be surprising
  //. for functions that aren't reflexive, transitive, and symmetric
  //. (see [equivalence][] relation).
  //.
  //. Properties:
  //.
  //.   - `forall f :: a -> a -> Boolean, xs :: Array a.
  //.      S.join(S.groupBy(f, xs)) = xs`
  //.
  //. ```javascript
  //. > S.groupBy(S.equals, [1, 1, 2, 1, 1])
  //. [[1, 1], [2], [1, 1]]
  //.
  //. > S.groupBy(x => y => x + y === 0, [2, -3, 3, 3, 3, 4, -4, 4])
  //. [[2], [-3, 3, 3, 3], [4, -4], [4]]
  //. ```
  function groupBy(f, xs) {
    if (xs.length === 0) return [];
    var x0 = xs[0];         // :: a
    var active = [x0];      // :: Array a
    var result = [active];  // :: Array (Array a)
    for (var idx = 1; idx < xs.length; idx += 1) {
      var x = xs[idx];
      if (f(x0)(x)) active.push(x); else result.push(active = [x0 = x]);
    }
    return result;
  }
  S.groupBy =
  def('groupBy',
      {},
      [Fn(a, $.Predicate(a)), $.Array(a), $.Array($.Array(a))],
      groupBy);

  //# reverse :: (Applicative f, Foldable f, Monoid (f a)) => f a -> f a
  //.
  //. Reverses the elements of the given structure.
  //.
  //. ```javascript
  //. > S.reverse([1, 2, 3])
  //. [3, 2, 1]
  //.
  //. > S.reverse(Cons(1, Cons(2, Cons(3, Nil))))
  //. Cons(3, Cons(2, Cons(1, Nil)))
  //.
  //. > S.pipe([S.splitOn(''), S.reverse, S.joinWith('')], 'abc')
  //. 'cba'
  //. ```
  S.reverse =
  def('reverse',
      {f: [Z.Applicative, Z.Foldable, Z.Monoid]},
      [f(a), f(a)],
      Z.reverse);

  //# sort :: (Ord a, Applicative m, Foldable m, Monoid (m a)) => m a -> m a
  //.
  //. Performs a [stable sort][] of the elements of the given structure, using
  //. [`Z.lte`][] for comparisons.
  //.
  //. Properties:
  //.
  //.   - `S.sort(S.sort(m)) = S.sort(m)` (idempotence)
  //.
  //. See also [`sortBy`](#sortBy).
  //.
  //. ```javascript
  //. > S.sort(['foo', 'bar', 'baz'])
  //. ['bar', 'baz', 'foo']
  //.
  //. > S.sort([S.Left(4), S.Right(3), S.Left(2), S.Right(1)])
  //. [Left(2), Left(4), Right(1), Right(3)]
  //. ```
  S.sort =
  def('sort',
      {a: [Z.Ord], m: [Z.Applicative, Z.Foldable, Z.Monoid]},
      [m(a), m(a)],
      Z.sort);

  //# sortBy :: (Ord b, Applicative m, Foldable m, Monoid (m a)) => (a -> b) -> m a -> m a
  //.
  //. Performs a [stable sort][] of the elements of the given structure, using
  //. [`Z.lte`][] to compare the values produced by applying the given function
  //. to each element of the structure.
  //.
  //. Properties:
  //.
  //.   - `S.sortBy(f, S.sortBy(f, m)) = S.sortBy(f, m)` (idempotence)
  //.
  //. See also [`sort`](#sort).
  //.
  //. ```javascript
  //. > S.sortBy(S.prop('rank'), [
  //. .   {rank: 7, suit: 'spades'},
  //. .   {rank: 5, suit: 'hearts'},
  //. .   {rank: 2, suit: 'hearts'},
  //. .   {rank: 5, suit: 'spades'},
  //. . ])
  //. [ {rank: 2, suit: 'hearts'},
  //. . {rank: 5, suit: 'hearts'},
  //. . {rank: 5, suit: 'spades'},
  //. . {rank: 7, suit: 'spades'} ]
  //.
  //. > S.sortBy(S.prop('suit'), [
  //. .   {rank: 7, suit: 'spades'},
  //. .   {rank: 5, suit: 'hearts'},
  //. .   {rank: 2, suit: 'hearts'},
  //. .   {rank: 5, suit: 'spades'},
  //. . ])
  //. [ {rank: 5, suit: 'hearts'},
  //. . {rank: 2, suit: 'hearts'},
  //. . {rank: 7, suit: 'spades'},
  //. . {rank: 5, suit: 'spades'} ]
  //. ```
  S.sortBy =
  def('sortBy',
      {b: [Z.Ord], m: [Z.Applicative, Z.Foldable, Z.Monoid]},
      [Fn(a, b), m(a), m(a)],
      Z.sortBy);

  //. ### Object

  //# prop :: String -> a -> b
  //.
  //. Takes a property name and an object with known properties and returns
  //. the value of the specified property. If for some reason the object
  //. lacks the specified property, a type error is thrown.
  //.
  //. For accessing properties of uncertain objects, use [`get`](#get) instead.
  //.
  //. See also [`pluck`](#pluck).
  //.
  //. ```javascript
  //. > S.prop('a', {a: 1, b: 2})
  //. 1
  //. ```
  function prop(key, x) {
    var obj = toObject(x);
    if (key in obj) return obj[key];
    throw new TypeError('‘prop’ expected object to have a property named ‘' +
                        key + '’; ' + Z.toString(x) + ' does not');
  }
  S.prop = def('prop', {}, [$.String, a, b], prop);

  //# props :: Array String -> a -> b
  //.
  //. Takes a property path (an array of property names) and an object with
  //. known structure and returns the value at the given path. If for some
  //. reason the path does not exist, a type error is thrown.
  //.
  //. For accessing property paths of uncertain objects, use [`gets`](#gets)
  //. instead.
  //.
  //. ```javascript
  //. > S.props(['a', 'b', 'c'], {a: {b: {c: 1}}})
  //. 1
  //. ```
  function props(path, x) {
    return path.reduce(function(x, key) {
      var obj = toObject(x);
      if (key in obj) return obj[key];
      throw new TypeError('‘props’ expected object to have a property at ' +
                          Z.toString(path) + '; ' +
                          Z.toString(x) + ' does not');
    }, x);
  }
  S.props = def('props', {}, [$.Array($.String), a, b], props);

  //# get :: (Any -> Boolean) -> String -> a -> Maybe b
  //.
  //. Takes a predicate, a property name, and an object and returns Just the
  //. value of the specified object property if it exists and the value
  //. satisfies the given predicate; Nothing otherwise.
  //.
  //. See also [`gets`](#gets) and [`prop`](#prop).
  //.
  //. ```javascript
  //. > S.get(S.is(Number), 'x', {x: 1, y: 2})
  //. Just(1)
  //.
  //. > S.get(S.is(Number), 'x', {x: '1', y: '2'})
  //. Nothing
  //.
  //. > S.get(S.is(Number), 'x', {})
  //. Nothing
  //.
  //. > S.get($.test([], $.Array($.Number)), 'x', {x: [1, 2, 3]})
  //. Just([1, 2, 3])
  //.
  //. > S.get($.test([], $.Array($.Number)), 'x', {x: [1, 2, 3, null]})
  //. Nothing
  //. ```
  function get(pred, key, x) {
    var obj = toObject(x);
    if (key in obj) {
      var val = obj[key];
      if (pred(val)) return Just(val);
    }
    return Nothing;
  }
  S.get = def('get', {}, [$.Predicate($.Any), $.String, a, $Maybe(b)], get);

  //# gets :: (Any -> Boolean) -> Array String -> a -> Maybe b
  //.
  //. Takes a predicate, a property path (an array of property names), and
  //. an object and returns Just the value at the given path if such a path
  //. exists and the value satisfies the given predicate; Nothing otherwise.
  //.
  //. See also [`get`](#get).
  //.
  //. ```javascript
  //. > S.gets(S.is(Number), ['a', 'b', 'c'], {a: {b: {c: 42}}})
  //. Just(42)
  //.
  //. > S.gets(S.is(Number), ['a', 'b', 'c'], {a: {b: {c: '42'}}})
  //. Nothing
  //.
  //. > S.gets(S.is(Number), ['a', 'b', 'c'], {})
  //. Nothing
  //. ```
  function gets(pred, keys, x) {
    return Z.filter(pred, Z.reduce(function(m, key) {
      return Z.chain(function(x) {
        var obj = toObject(x);
        return key in obj ? Just(obj[key]) : Nothing;
      }, m);
    }, Just(x), keys));
  }
  S.gets =
  def('gets', {}, [$.Predicate($.Any), $.Array($.String), a, $Maybe(b)], gets);

  //. ### StrMap
  //.
  //. StrMap is an abbreviation of _string map_. A string map is an object,
  //. such as `{foo: 1, bar: 2, baz: 3}`, whose values are all members of
  //. the same type. Formally, a value is a member of type `StrMap a` if its
  //. [type identifier][] is `'Object'` and the values of its enumerable own
  //. properties are all members of type `a`.

  //# singleton :: String -> a -> StrMap a
  //.
  //. Takes a string and a value of any type, and returns a string map with
  //. a single entry (mapping the key to the value).
  //.
  //. ```javascript
  //. > S.singleton('foo', 42)
  //. {foo: 42}
  //. ```
  function singleton(key, val) {
    var strMap = {};
    strMap[key] = val;
    return strMap;
  }
  S.singleton = def('singleton', {}, [$.String, a, $.StrMap(a)], singleton);

  //# insert :: String -> a -> StrMap a -> StrMap a
  //.
  //. Takes a string, a value of any type, and a string map, and returns a
  //. string map comprising all the entries of the given string map plus the
  //. entry specified by the first two arguments (which takes precedence).
  //.
  //. Equivalent to Haskell's `insert` function. Similar to Clojure's `assoc`
  //. function.
  //.
  //. ```javascript
  //. > S.insert('c', 3, {a: 1, b: 2})
  //. {a: 1, b: 2, c: 3}
  //.
  //. > S.insert('a', 4, {a: 1, b: 2})
  //. {a: 4, b: 2}
  //. ```
  function insert(key, val, strMap) {
    return Z.concat(strMap, singleton(key, val));
  }
  S.insert =
  def('insert', {}, [$.String, a, $.StrMap(a), $.StrMap(a)], insert);

  //# remove :: String -> StrMap a -> StrMap a
  //.
  //. Takes a string and a string map, and returns a string map comprising all
  //. the entries of the given string map except the one whose key matches the
  //. given string (if such a key exists).
  //.
  //. Equivalent to Haskell's `delete` function. Similar to Clojure's `dissoc`
  //. function.
  //.
  //. ```javascript
  //. > S.remove('c', {a: 1, b: 2, c: 3})
  //. {a: 1, b: 2}
  //.
  //. > S.remove('c', {})
  //. {}
  //. ```
  function remove(key, strMap) {
    var result = Z.concat(strMap, {});
    delete result[key];
    return result;
  }
  S.remove = def('remove', {}, [$.String, $.StrMap(a), $.StrMap(a)], remove);

  //# keys :: StrMap a -> Array String
  //.
  //. Returns the keys of the given string map, in arbitrary order.
  //.
  //. ```javascript
  //. > S.keys({b: 2, c: 3, a: 1}).sort()
  //. ['a', 'b', 'c']
  //. ```
  S.keys = def('keys', {}, [$.StrMap(a), $.Array($.String)], Object.keys);

  //# values :: StrMap a -> Array a
  //.
  //. Returns the values of the given string map, in arbitrary order.
  //.
  //. ```javascript
  //. > S.values({a: 1, c: 3, b: 2}).sort()
  //. [1, 2, 3]
  //. ```
  function values(strMap) {
    return Z.map(function(k) { return strMap[k]; }, Object.keys(strMap));
  }
  S.values = def('values', {}, [$.StrMap(a), $.Array(a)], values);

  //# pairs :: StrMap a -> Array (Pair String a)
  //.
  //. Returns the key–value pairs of the given string map, in arbitrary order.
  //.
  //. ```javascript
  //. > S.pairs({b: 2, a: 1, c: 3}).sort()
  //. [['a', 1], ['b', 2], ['c', 3]]
  //. ```
  function pairs(strMap) {
    return Z.map(function(k) { return [k, strMap[k]]; }, Object.keys(strMap));
  }
  S.pairs =
  def('pairs', {}, [$.StrMap(a), $.Array($.Pair($.String, a))], pairs);

  //# fromPairs :: Foldable f => f (Pair String a) -> StrMap a
  //.
  //. Returns a string map containing the key–value pairs specified by the
  //. given [Foldable][]. If a key appears in multiple pairs, the rightmost
  //. pair takes precedence.
  //.
  //. ```javascript
  //. > S.fromPairs([['a', 1], ['b', 2], ['c', 3]])
  //. {a: 1, b: 2, c: 3}
  //.
  //. > S.fromPairs([['x', 1], ['x', 2]])
  //. {x: 2}
  //. ```
  function fromPairs(pairs) {
    return Z.reduce(function(strMap, pair) {
      strMap[pair[0]] = pair[1];
      return strMap;
    }, {}, pairs);
  }
  S.fromPairs =
  def('fromPairs',
      {f: [Z.Foldable]},
      [f($.Pair($.String, a)), $.StrMap(a)],
      fromPairs);

  //. ### Number

  //# negate :: ValidNumber -> ValidNumber
  //.
  //. Negates its argument.
  //.
  //. ```javascript
  //. > S.negate(12.5)
  //. -12.5
  //.
  //. > S.negate(-42)
  //. 42
  //. ```
  function negate(n) {
    return -n;
  }
  S.negate = def('negate', {}, [$.ValidNumber, $.ValidNumber], negate);

  //# add :: FiniteNumber -> FiniteNumber -> FiniteNumber
  //.
  //. Returns the sum of two (finite) numbers.
  //.
  //. ```javascript
  //. > S.add(1, 1)
  //. 2
  //. ```
  function add(x, y) {
    return x + y;
  }
  S.add =
  def('add', {}, [$.FiniteNumber, $.FiniteNumber, $.FiniteNumber], add);

  //# sum :: Foldable f => f FiniteNumber -> FiniteNumber
  //.
  //. Returns the sum of the given array of (finite) numbers.
  //.
  //. ```javascript
  //. > S.sum([1, 2, 3, 4, 5])
  //. 15
  //.
  //. > S.sum([])
  //. 0
  //.
  //. > S.sum(S.Just(42))
  //. 42
  //.
  //. > S.sum(S.Nothing)
  //. 0
  //. ```
  function sum(foldable) {
    return Z.reduce(add, 0, foldable);
  }
  S.sum =
  def('sum', {f: [Z.Foldable]}, [f($.FiniteNumber), $.FiniteNumber], sum);

  //# sub :: FiniteNumber -> (FiniteNumber -> FiniteNumber)
  //.
  //. Takes a finite number `n` and returns the _subtract `n`_ function.
  //.
  //. See also [`sub_`](#sub_).
  //.
  //. ```javascript
  //. > S.map(S.sub(1), [1, 2, 3])
  //. [0, 1, 2]
  //. ```
  S.sub =
  def('sub',
      {},
      [$.FiniteNumber, Fn($.FiniteNumber, $.FiniteNumber)],
      flip$(sub_));

  //# sub_ :: FiniteNumber -> FiniteNumber -> FiniteNumber
  //.
  //. Returns the difference between two (finite) numbers.
  //.
  //. See also [`sub`](#sub).
  //.
  //. ```javascript
  //. > S.sub_(4, 2)
  //. 2
  //. ```
  function sub_(x, y) {
    return x - y;
  }
  S.sub_ =
  def('sub_', {}, [$.FiniteNumber, $.FiniteNumber, $.FiniteNumber], sub_);

  //# mult :: FiniteNumber -> FiniteNumber -> FiniteNumber
  //.
  //. Returns the product of two (finite) numbers.
  //.
  //. ```javascript
  //. > S.mult(4, 2)
  //. 8
  //. ```
  function mult(x, y) {
    return x * y;
  }
  S.mult =
  def('mult', {}, [$.FiniteNumber, $.FiniteNumber, $.FiniteNumber], mult);

  //# product :: Foldable f => f FiniteNumber -> FiniteNumber
  //.
  //. Returns the product of the given array of (finite) numbers.
  //.
  //. ```javascript
  //. > S.product([1, 2, 3, 4, 5])
  //. 120
  //.
  //. > S.product([])
  //. 1
  //.
  //. > S.product(S.Just(42))
  //. 42
  //.
  //. > S.product(S.Nothing)
  //. 1
  //. ```
  function product(foldable) {
    return Z.reduce(mult, 1, foldable);
  }
  S.product =
  def('product',
      {f: [Z.Foldable]},
      [f($.FiniteNumber), $.FiniteNumber],
      product);

  //# div :: NonZeroFiniteNumber -> (FiniteNumber -> FiniteNumber)
  //.
  //. Takes a non-zero finite number `n` and returns the _divide by `n`_
  //. function.
  //.
  //. See also [`div_`](#div_).
  //.
  //. ```javascript
  //. > S.map(S.div(2), [0, 1, 2, 3])
  //. [0, 0.5, 1, 1.5]
  //. ```
  S.div =
  def('div',
      {},
      [$.NonZeroFiniteNumber, Fn($.FiniteNumber, $.FiniteNumber)],
      flip$(div_));

  //# div_ :: FiniteNumber -> NonZeroFiniteNumber -> FiniteNumber
  //.
  //. Returns the result of dividing its first argument (a finite number) by
  //. its second argument (a non-zero finite number).
  //.
  //. See also [`div`](#div).
  //.
  //. ```javascript
  //. > S.div_(7, 2)
  //. 3.5
  //.
  //. > S.map(S.div_(24), [1, 2, 3, 4])
  //. [24, 12, 8, 6]
  //. ```
  function div_(x, y) {
    return x / y;
  }
  S.div_ =
  def('div_',
      {},
      [$.FiniteNumber, $.NonZeroFiniteNumber, $.FiniteNumber],
      div_);

  //# pow :: FiniteNumber -> (FiniteNumber -> FiniteNumber)
  //.
  //. Takes a finite number `n` and returns the _power of `n`_ function.
  //.
  //. See also [`pow_`](#pow_).
  //.
  //. ```javascript
  //. > S.map(S.pow(2), [-3, -2, -1, 0, 1, 2, 3])
  //. [9, 4, 1, 0, 1, 4, 9]
  //.
  //. > S.map(S.pow(0.5), [1, 4, 9, 16, 25])
  //. [1, 2, 3, 4, 5]
  //. ```
  S.pow =
  def('pow',
      {},
      [$.FiniteNumber, Fn($.FiniteNumber, $.FiniteNumber)],
      flip$(Math.pow));

  //# pow_ :: FiniteNumber -> FiniteNumber -> FiniteNumber
  //.
  //. Curried version of [`Math.pow`][].
  //.
  //. See also [`pow`](#pow).
  //.
  //. ```javascript
  //. > S.map(S.pow_(10), [-3, -2, -1, 0, 1, 2, 3])
  //. [0.001, 0.01, 0.1, 1, 10, 100, 1000]
  //. ```
  S.pow_ =
  def('pow_', {}, [$.FiniteNumber, $.FiniteNumber, $.FiniteNumber], Math.pow);

  //# mean :: Foldable f => f FiniteNumber -> Maybe FiniteNumber
  //.
  //. Returns the mean of the given array of (finite) numbers.
  //.
  //. ```javascript
  //. > S.mean([1, 2, 3, 4, 5])
  //. Just(3)
  //.
  //. > S.mean([])
  //. Nothing
  //.
  //. > S.mean(S.Just(42))
  //. Just(42)
  //.
  //. > S.mean(S.Nothing)
  //. Nothing
  //. ```
  function mean(foldable) {
    var result = Z.reduce(
      function(acc, n) {
        acc.total += n;
        acc.count += 1;
        return acc;
      },
      {total: 0, count: 0},
      foldable
    );
    return result.count > 0 ? Just(result.total / result.count) : Nothing;
  }
  S.mean =
  def('mean',
      {f: [Z.Foldable]},
      [f($.FiniteNumber), $Maybe($.FiniteNumber)],
      mean);

  //. ### Integer

  //# even :: Integer -> Boolean
  //.
  //. Returns `true` if the given integer is even; `false` if it is odd.
  //.
  //. ```javascript
  //. > S.even(42)
  //. true
  //.
  //. > S.even(99)
  //. false
  //. ```
  function even(n) {
    return n % 2 === 0;
  }
  S.even = def('even', {}, [$.Integer, $.Boolean], even);

  //# odd :: Integer -> Boolean
  //.
  //. Returns `true` if the given integer is odd; `false` if it is even.
  //.
  //. ```javascript
  //. > S.odd(99)
  //. true
  //.
  //. > S.odd(42)
  //. false
  //. ```
  function odd(n) {
    return n % 2 !== 0;
  }
  S.odd = def('odd', {}, [$.Integer, $.Boolean], odd);

  //. ### Parse

  //# parseDate :: String -> Maybe ValidDate
  //.
  //. Takes a string and returns Just the date represented by the string
  //. if it does in fact represent a date; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.parseDate('2011-01-19T17:40:00Z')
  //. Just(new Date('2011-01-19T17:40:00.000Z'))
  //.
  //. > S.parseDate('today')
  //. Nothing
  //. ```
  function parseDate(s) {
    var date = new Date(s);
    return isNaN(date.valueOf()) ? Nothing : Just(date);
  }
  S.parseDate =
  def('parseDate', {}, [$.String, $Maybe($.ValidDate)], parseDate);

  //  requiredNonCapturingGroup :: Array String -> String
  function requiredNonCapturingGroup(xs) {
    return '(?:' + xs.join('|') + ')';
  }

  //  optionalNonCapturingGroup :: Array String -> String
  function optionalNonCapturingGroup(xs) {
    return requiredNonCapturingGroup(xs) + '?';
  }

  //  validFloatRepr :: RegExp
  var validFloatRepr = new RegExp(
    '^' +                     // start-of-string anchor
    '\\s*' +                  // any number of leading whitespace characters
    '[+-]?' +                 // optional sign
    requiredNonCapturingGroup([
      'Infinity',             // "Infinity"
      'NaN',                  // "NaN"
      requiredNonCapturingGroup([
        '[0-9]+',             // number
        '[0-9]+[.][0-9]+',    // number with interior decimal point
        '[0-9]+[.]',          // number with trailing decimal point
        '[.][0-9]+'           // number with leading decimal point
      ]) +
      optionalNonCapturingGroup([
        '[Ee]' +              // "E" or "e"
        '[+-]?' +             // optional sign
        '[0-9]+'              // exponent
      ])
    ]) +
    '\\s*' +                  // any number of trailing whitespace characters
    '$'                       // end-of-string anchor
  );

  //# parseFloat :: String -> Maybe Number
  //.
  //. Takes a string and returns Just the number represented by the string
  //. if it does in fact represent a number; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.parseFloat('-123.45')
  //. Just(-123.45)
  //.
  //. > S.parseFloat('foo.bar')
  //. Nothing
  //. ```
  function parseFloat_(s) {
    return validFloatRepr.test(s) ? Just(parseFloat(s)) : Nothing;
  }
  S.parseFloat =
  def('parseFloat', {}, [$.String, $Maybe($.Number)], parseFloat_);

  //  Radix :: Type
  var Radix = $.NullaryType(
    'sanctuary/Radix',
    '',
    function(x) { return $.Integer._test(x) && x >= 2 && x <= 36; }
  );

  //# parseInt :: Radix -> String -> Maybe Integer
  //.
  //. Takes a radix (an integer between 2 and 36 inclusive) and a string,
  //. and returns Just the number represented by the string if it does in
  //. fact represent a number in the base specified by the radix; Nothing
  //. otherwise.
  //.
  //. This function is stricter than [`parseInt`][parseInt]: a string
  //. is considered to represent an integer only if all its non-prefix
  //. characters are members of the character set specified by the radix.
  //.
  //. ```javascript
  //. > S.parseInt(10, '-42')
  //. Just(-42)
  //.
  //. > S.parseInt(16, '0xFF')
  //. Just(255)
  //.
  //. > S.parseInt(16, '0xGG')
  //. Nothing
  //. ```
  function parseInt_(radix, s) {
    var charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, radix);
    var pattern = new RegExp('^[' + charset + ']+$', 'i');

    var t = s.replace(/^[+-]/, '');
    if (pattern.test(radix === 16 ? t.replace(/^0x/i, '') : t)) {
      var n = parseInt(s, radix);
      if ($.Integer._test(n)) return Just(n);
    }
    return Nothing;
  }
  S.parseInt =
  def('parseInt', {}, [Radix, $.String, $Maybe($.Integer)], parseInt_);

  //# parseJson :: (Any -> Boolean) -> String -> Maybe a
  //.
  //. Takes a predicate and a string which may or may not be valid JSON, and
  //. returns Just the result of applying `JSON.parse` to the string *if* the
  //. result satisfies the predicate; Nothing otherwise.
  //.
  //. ```javascript
  //. > S.parseJson($.test([], $.Array($.Integer)), '[')
  //. Nothing
  //.
  //. > S.parseJson($.test([], $.Array($.Integer)), '["1","2","3"]')
  //. Nothing
  //.
  //. > S.parseJson($.test([], $.Array($.Integer)), '[0,1.5,3,4.5]')
  //. Nothing
  //.
  //. > S.parseJson($.test([], $.Array($.Integer)), '[1,2,3]')
  //. Just([1, 2, 3])
  //. ```
  function parseJson(pred, s) {
    return Z.filter(pred, encase(JSON.parse, s));
  }
  S.parseJson =
  def('parseJson', {}, [$.Predicate($.Any), $.String, $Maybe(a)], parseJson);

  //. ### RegExp

  //  Match :: Type
  var Match = $.RecordType({
    match: $.String,
    groups: $.Array($Maybe($.String))
  });

  //  toMatch :: Array String? -> Match
  function toMatch(ss) {
    return {match: ss[0], groups: ss.slice(1).map(toMaybe)};
  }

  //  withRegex :: (RegExp, () -> a) -> a
  function withRegex(pattern, thunk) {
    var lastIndex = pattern.lastIndex;
    var result = thunk();
    pattern.lastIndex = lastIndex;
    return result;
  }

  //# regex :: RegexFlags -> String -> RegExp
  //.
  //. Takes a [RegexFlags][] and a pattern, and returns a RegExp.
  //.
  //. ```javascript
  //. > S.regex('g', ':\\d+:')
  //. /:\d+:/g
  //. ```
  function regex(flags, source) {
    return new RegExp(source, flags);
  }
  S.regex = def('regex', {}, [$.RegexFlags, $.String, $.RegExp], regex);

  //# regexEscape :: String -> String
  //.
  //. Takes a string which may contain regular expression metacharacters,
  //. and returns a string with those metacharacters escaped.
  //.
  //. Properties:
  //.
  //.   - `forall s :: String. S.test(S.regex('', S.regexEscape(s)), s) = true`
  //.
  //. ```javascript
  //. > S.regexEscape('-=*{XYZ}*=-')
  //. '\\-=\\*\\{XYZ\\}\\*=\\-'
  //. ```
  function regexEscape(s) {
    return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }
  S.regexEscape = def('regexEscape', {}, [$.String, $.String], regexEscape);

  //# test :: RegExp -> String -> Boolean
  //.
  //. Takes a pattern and a string, and returns `true` [iff][] the pattern
  //. matches the string.
  //.
  //. ```javascript
  //. > S.test(/^a/, 'abacus')
  //. true
  //.
  //. > S.test(/^a/, 'banana')
  //. false
  //. ```
  function test(pattern, s) {
    return withRegex(pattern, function() { return pattern.test(s); });
  }
  S.test = def('test', {}, [$.RegExp, $.String, $.Boolean], test);

  //# match :: NonGlobalRegExp -> String -> Maybe { match :: String, groups :: Array (Maybe String) }
  //.
  //. Takes a pattern and a string, and returns Just a match record if the
  //. pattern matches the string; Nothing otherwise.
  //.
  //. `groups :: Array (Maybe String)` acknowledges the existence of optional
  //. capturing groups.
  //.
  //. Properties:
  //.
  //.   - `forall p :: Pattern, s :: String.
  //.      S.head(S.matchAll(S.regex('g', p), s)) = S.match(S.regex('', p), s)`
  //.
  //. See also [`matchAll`](#matchAll).
  //.
  //. ```javascript
  //. > S.match(/(good)?bye/, 'goodbye')
  //. Just({match: 'goodbye', groups: [Just('good')]})
  //.
  //. > S.match(/(good)?bye/, 'bye')
  //. Just({match: 'bye', groups: [Nothing]})
  //. ```
  function match(pattern, s) {
    return Z.map(toMatch, toMaybe(s.match(pattern)));
  }
  S.match =
  def('match', {}, [$.NonGlobalRegExp, $.String, $Maybe(Match)], match);

  //# matchAll :: GlobalRegExp -> String -> Array { match :: String, groups :: Array (Maybe String) }
  //.
  //. Takes a pattern and a string, and returns an array of match records.
  //.
  //. `groups :: Array (Maybe String)` acknowledges the existence of optional
  //. capturing groups.
  //.
  //. See also [`match`](#match).
  //.
  //. ```javascript
  //. > S.matchAll(/@([a-z]+)/g, 'Hello, world!')
  //. []
  //.
  //. > S.matchAll(/@([a-z]+)/g, 'Hello, @foo! Hello, @bar! Hello, @baz!')
  //. [ {match: '@foo', groups: [Just('foo')]},
  //. . {match: '@bar', groups: [Just('bar')]},
  //. . {match: '@baz', groups: [Just('baz')]} ]
  //. ```
  function matchAll(pattern, s) {
    return withRegex(pattern, function() {
      return unfoldr(function(_) {
        return Z.map(function(ss) {
          return [toMatch(ss), null];
        }, toMaybe(pattern.exec(s)));
      }, []);
    });
  }
  S.matchAll =
  def('matchAll', {}, [$.GlobalRegExp, $.String, $.Array(Match)], matchAll);

  //. ### String

  //# toUpper :: String -> String
  //.
  //. Returns the upper-case equivalent of its argument.
  //.
  //. See also [`toLower`](#toLower).
  //.
  //. ```javascript
  //. > S.toUpper('ABC def 123')
  //. 'ABC DEF 123'
  //. ```
  function toUpper(s) {
    return s.toUpperCase();
  }
  S.toUpper = def('toUpper', {}, [$.String, $.String], toUpper);

  //# toLower :: String -> String
  //.
  //. Returns the lower-case equivalent of its argument.
  //.
  //. See also [`toUpper`](#toUpper).
  //.
  //. ```javascript
  //. > S.toLower('ABC def 123')
  //. 'abc def 123'
  //. ```
  function toLower(s) {
    return s.toLowerCase();
  }
  S.toLower = def('toLower', {}, [$.String, $.String], toLower);

  //# trim :: String -> String
  //.
  //. Strips leading and trailing whitespace characters.
  //.
  //. ```javascript
  //. > S.trim('\t\t foo bar \n')
  //. 'foo bar'
  //. ```
  function trim(s) {
    return s.trim();
  }
  S.trim = def('trim', {}, [$.String, $.String], trim);

  //# stripPrefix :: String -> String -> Maybe String
  //.
  //. Returns Just the portion of the given string (the second argument) left
  //. after removing the given prefix (the first argument) if the string starts
  //. with the prefix; Nothing otherwise.
  //.
  //. See also [`stripSuffix`](#stripSuffix).
  //.
  //. ```javascript
  //. > S.stripPrefix('https://', 'https://sanctuary.js.org')
  //. Just('sanctuary.js.org')
  //.
  //. > S.stripPrefix('https://', 'http://sanctuary.js.org')
  //. Nothing
  //. ```
  function stripPrefix(prefix, s) {
    var idx = prefix.length;
    return s.slice(0, idx) === prefix ? Just(s.slice(idx)) : Nothing;
  }
  S.stripPrefix =
  def('stripPrefix', {}, [$.String, $.String, $Maybe($.String)], stripPrefix);

  //# stripSuffix :: String -> String -> Maybe String
  //.
  //. Returns Just the portion of the given string (the second argument) left
  //. after removing the given suffix (the first argument) if the string ends
  //. with the suffix; Nothing otherwise.
  //.
  //. See also [`stripPrefix`](#stripPrefix).
  //.
  //. ```javascript
  //. > S.stripSuffix('.md', 'README.md')
  //. Just('README')
  //.
  //. > S.stripSuffix('.md', 'README')
  //. Nothing
  //. ```
  function stripSuffix(suffix, s) {
    var idx = s.length - suffix.length;  // value may be negative
    return s.slice(idx) === suffix ? Just(s.slice(0, idx)) : Nothing;
  }
  S.stripSuffix =
  def('stripSuffix', {}, [$.String, $.String, $Maybe($.String)], stripSuffix);

  //# words :: String -> Array String
  //.
  //. Takes a string and returns the array of words the string contains
  //. (words are delimited by whitespace characters).
  //.
  //. See also [`unwords`](#unwords).
  //.
  //. ```javascript
  //. > S.words(' foo bar baz ')
  //. ['foo', 'bar', 'baz']
  //. ```
  function words(s) {
    var words = s.split(/\s+/);
    return words.slice(words[0] === '' ? 1 : 0,
                       words[words.length - 1] === '' ? -1 : Infinity);
  }
  S.words = def('words', {}, [$.String, $.Array($.String)], words);

  //# unwords :: Array String -> String
  //.
  //. Takes an array of words and returns the result of joining the words
  //. with separating spaces.
  //.
  //. See also [`words`](#words).
  //.
  //. ```javascript
  //. > S.unwords(['foo', 'bar', 'baz'])
  //. 'foo bar baz'
  //. ```
  function unwords(xs) {
    return xs.join(' ');
  }
  S.unwords = def('unwords', {}, [$.Array($.String), $.String], unwords);

  //# lines :: String -> Array String
  //.
  //. Takes a string and returns the array of lines the string contains
  //. (lines are delimited by newlines: `'\n'` or `'\r\n'` or `'\r'`).
  //. The resulting strings do not contain newlines.
  //.
  //. See also [`unlines`](#unlines).
  //.
  //. ```javascript
  //. > S.lines('foo\nbar\nbaz\n')
  //. ['foo', 'bar', 'baz']
  //. ```
  function lines(s) {
    var match = s.replace(/\r\n?/g, '\n').match(/^(?=[\s\S]).*/gm);
    return match == null ? [] : match;
  }
  S.lines = def('lines', {}, [$.String, $.Array($.String)], lines);

  //# unlines :: Array String -> String
  //.
  //. Takes an array of lines and returns the result of joining the lines
  //. after appending a terminating line feed (`'\n'`) to each.
  //.
  //. See also [`lines`](#lines).
  //.
  //. ```javascript
  //. > S.unlines(['foo', 'bar', 'baz'])
  //. 'foo\nbar\nbaz\n'
  //. ```
  function unlines(xs) {
    return Z.reduce(function(s, x) { return s + x + '\n'; }, '', xs);
  }
  S.unlines = def('unlines', {}, [$.Array($.String), $.String], unlines);

  //# splitOn :: String -> String -> Array String
  //.
  //. Returns the substrings of its second argument separated by occurrences
  //. of its first argument.
  //.
  //. See also [`joinWith`](#joinWith) and [`splitOnRegex`](#splitOnRegex).
  //.
  //. ```javascript
  //. > S.splitOn('::', 'foo::bar::baz')
  //. ['foo', 'bar', 'baz']
  //. ```
  function splitOn(separator, s) {
    return s.split(separator);
  }
  S.splitOn =
  def('splitOn', {}, [$.String, $.String, $.Array($.String)], splitOn);

  //# splitOnRegex :: GlobalRegExp -> String -> Array String
  //.
  //. Takes a pattern and a string, and returns the result of splitting the
  //. string at every non-overlapping occurrence of the pattern.
  //.
  //. Properties:
  //.
  //.   - `forall s :: String, t :: String.
  //.      S.joinWith(s, S.splitOnRegex(S.regex('g', S.regexEscape(s)), t))
  //.      = t`
  //.
  //. See also [`splitOn`](#splitOn).
  //.
  //. ```javascript
  //. > S.splitOnRegex(/[,;][ ]*/g, 'foo, bar, baz')
  //. ['foo', 'bar', 'baz']
  //.
  //. > S.splitOnRegex(/[,;][ ]*/g, 'foo;bar;baz')
  //. ['foo', 'bar', 'baz']
  //. ```
  function splitOnRegex(pattern, s) {
    return withRegex(pattern, function() {
      var result = [];
      var lastIndex = 0;
      var match;
      while ((match = pattern.exec(s)) != null) {
        if (pattern.lastIndex === lastIndex && match[0] === '') {
          if (pattern.lastIndex === s.length) return result;
          pattern.lastIndex += 1;
        } else {
          result.push(s.slice(lastIndex, match.index));
          lastIndex = match.index + match[0].length;
        }
      }
      result.push(s.slice(lastIndex));
      return result;
    });
  }
  S.splitOnRegex =
  def('splitOnRegex',
      {},
      [$.GlobalRegExp, $.String, $.Array($.String)],
      splitOnRegex);

  return S;

  /* eslint-enable indent */

  }

  return createSanctuary({checkTypes: true, env: defaultEnv});

}));

//. [$.Array]:          v:sanctuary-js/sanctuary-def#Array
//. [$.String]:         v:sanctuary-js/sanctuary-def#String
//. [Alt]:              v:fantasyland/fantasy-land#alt
//. [Alternative]:      v:fantasyland/fantasy-land#alternative
//. [Applicative]:      v:fantasyland/fantasy-land#applicative
//. [Apply]:            v:fantasyland/fantasy-land#apply
//. [Bifunctor]:        v:fantasyland/fantasy-land#bifunctor
//. [BinaryType]:       v:sanctuary-js/sanctuary-def#BinaryType
//. [Either]:           #either-type
//. [Extend]:           v:fantasyland/fantasy-land#extend
//. [Fantasy Land]:     v:fantasyland/fantasy-land
//. [Foldable]:         v:fantasyland/fantasy-land#foldable
//. [Haskell]:          https://www.haskell.org/
//. [Maybe]:            #maybe-type
//. [Monad]:            v:fantasyland/fantasy-land#monad
//. [Monoid]:           v:fantasyland/fantasy-land#monoid
//. [Nullable]:         v:sanctuary-js/sanctuary-def#Nullable
//. [Ord]:              v:fantasyland/fantasy-land#ord
//. [PureScript]:       http://www.purescript.org/
//. [Ramda]:            http://ramdajs.com/
//. [RegexFlags]:       v:sanctuary-js/sanctuary-def#RegexFlags
//. [Semigroup]:        v:fantasyland/fantasy-land#semigroup
//. [Semigroupoid]:     v:fantasyland/fantasy-land#semigroupoid
//. [Traversable]:      v:fantasyland/fantasy-land#traversable
//. [UnaryType]:        v:sanctuary-js/sanctuary-def#UnaryType
//. [`Math.pow`]:       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
//. [`Z.alt`]:          v:sanctuary-js/sanctuary-type-classes#alt
//. [`Z.ap`]:           v:sanctuary-js/sanctuary-type-classes#ap
//. [`Z.apFirst`]:      v:sanctuary-js/sanctuary-type-classes#apFirst
//. [`Z.apSecond`]:     v:sanctuary-js/sanctuary-type-classes#apSecond
//. [`Z.bimap`]:        v:sanctuary-js/sanctuary-type-classes#bimap
//. [`Z.chain`]:        v:sanctuary-js/sanctuary-type-classes#chain
//. [`Z.chainRec`]:     v:sanctuary-js/sanctuary-type-classes#chainRec
//. [`Z.compose`]:      v:sanctuary-js/sanctuary-type-classes#compose
//. [`Z.concat`]:       v:sanctuary-js/sanctuary-type-classes#concat
//. [`Z.contramap`]:    v:sanctuary-js/sanctuary-type-classes#contramap
//. [`Z.empty`]:        v:sanctuary-js/sanctuary-type-classes#empty
//. [`Z.equals`]:       v:sanctuary-js/sanctuary-type-classes#equals
//. [`Z.extend`]:       v:sanctuary-js/sanctuary-type-classes#extend
//. [`Z.extract`]:      v:sanctuary-js/sanctuary-type-classes#extract
//. [`Z.filter`]:       v:sanctuary-js/sanctuary-type-classes#filter
//. [`Z.filterM`]:      v:sanctuary-js/sanctuary-type-classes#filterM
//. [`Z.gt`]:           v:sanctuary-js/sanctuary-type-classes#gt
//. [`Z.gte`]:          v:sanctuary-js/sanctuary-type-classes#gte
//. [`Z.id`]:           v:sanctuary-js/sanctuary-type-classes#id
//. [`Z.invert`]:       v:sanctuary-js/sanctuary-type-classes#invert
//. [`Z.join`]:         v:sanctuary-js/sanctuary-type-classes#join
//. [`Z.lt`]:           v:sanctuary-js/sanctuary-type-classes#lt
//. [`Z.lte`]:          v:sanctuary-js/sanctuary-type-classes#lte
//. [`Z.map`]:          v:sanctuary-js/sanctuary-type-classes#map
//. [`Z.of`]:           v:sanctuary-js/sanctuary-type-classes#of
//. [`Z.promap`]:       v:sanctuary-js/sanctuary-type-classes#promap
//. [`Z.sequence`]:     v:sanctuary-js/sanctuary-type-classes#sequence
//. [`Z.toString`]:     v:sanctuary-js/sanctuary-type-classes#toString
//. [`Z.traverse`]:     v:sanctuary-js/sanctuary-type-classes#traverse
//. [`Z.zero`]:         v:sanctuary-js/sanctuary-type-classes#zero
//. [`of`]:             v:fantasyland/fantasy-land#of-method
//. [equivalence]:      https://en.wikipedia.org/wiki/Equivalence_relation
//. [iff]:              https://en.wikipedia.org/wiki/If_and_only_if
//. [parseInt]:         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
//. [sanctuary-def]:    v:sanctuary-js/sanctuary-def
//. [stable sort]:      https://en.wikipedia.org/wiki/Sorting_algorithm#Stability
//. [thrush]:           https://github.com/raganwald-deprecated/homoiconic/blob/master/2008-10-30/thrush.markdown
//. [type identifier]:  v:sanctuary-js/sanctuary-type-identifiers
//.
//. [`Either#fantasy-land/bimap`]:      #Either.prototype.fantasy-land/bimap
//. [`Either#fantasy-land/map`]:        #Either.prototype.fantasy-land/map
//. [`Either#toString`]:                #Either.prototype.toString
//. [`Maybe#toString`]:                 #Maybe.prototype.toString

},{"sanctuary-def":13,"sanctuary-type-classes":14,"sanctuary-type-identifiers":15}],10:[function(require,module,exports) {
'use strict';

var _require = require('sanctuary'),
    map = _require.map,
    toLower = _require.toLower,
    prop = _require.prop,
    joinWith = _require.joinWith,
    pipe = _require.pipe,
    concat = _require.concat,
    __ = _require.__;

var runtime = {
    JSON: '',
    String: '',
    Integer: ''
};

var declare = function declare(_ref) {
    var name = _ref.name;
    return 'const ' + name + ' = ';
};
var extract = function extract(_ref2) {
    var path = _ref2.path;
    return ' process.env[\'' + path + '\'] ';
};
var templateStr = function templateStr(varName) {
    return '${' + varName + '}';
};
// const assign = base => x => Object.assign({}, base, x )
// const getWords = str => tail( str.match(/[a-z_]*/ig) )
var templateExports = function templateExports(names) {
    return 'module.exports = { ' + names.join(', ') + ' }';
};
var processString = function processString(seen) {
    return function (_ref3) {
        var raw = _ref3.raw,
            val = _ref3.val;

        if (raw) {
            return '\'' + val + '\'';
        }
        return '`' + seen.reduce(function (acc, x) {
            return acc.replace(x, templateStr(x));
        }, val) + '`';
    };
};
var processDefault = function processDefault(seen) {
    var str = processString(seen);
    return function (def) {
        switch (def.type) {
            case 'string':
                return str(def);
            case 'integer':
            case 'boolean':
            default:
                return def.val;
        }
    };
};
var processDefaults = function processDefaults(seen) {
    return function (x) {
        return '|| ' + map(processDefault(seen), x).join(' ||');
    };
};

var compile = function compile(trees) {

    var symbols = map(prop('name'), trees); // Hoist symbols

    var compileExpression = function compileExpression(tree) {
        var body = tree.body,
            coerceTo = tree.coerceTo;

        var type = toLower(coerceTo);
        var defaults = map(function (_ref4) {
            var val = _ref4.val;
            return { type: type, val: val };
        }, body.defaults);
        console.log(defaults);
        return [declare(tree), extract(body), processDefaults(symbols)(defaults)];
    };

    return pipe([map(compileExpression), map(joinWith('')), joinWith(';\n'), concat(__, '\n' + templateExports(symbols) + ';\n'), concat('\'use strict;\'\n')])(trees);
};

module.exports = compile;
},{"sanctuary":12}],9:[function(require,module,exports) {
var logDeep = function logDeep(x) {
  return console.dir(x, { depth: 6, colors: true });
};

module.exports = { logDeep: logDeep };
},{}],6:[function(require,module,exports) {
'use strict';

var nearley = require("nearley");
var grammar = require("./grammar.js");
var compiler = require('./compiler');

var _require = require('../util'),
    logDeep = _require.logDeep;

// Create a Parser object from our grammar.


var parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

// Parse something!
module.exports = function (content) {

    parser.feed(content);
    // parser.results is an array of possible parsings.
    logDeep(parser.results); // [[[[ "foo" ],"\n" ]]]
    return compiler(parser.results[0]);
};
},{"nearley":11,"./grammar.js":8,"./compiler":10,"../util":9}],4:[function(require,module,exports) {
'use strict';
/**
 * READY FOR BE COMPILED WITH PARCEL
 */

var compile = require('../nearley/index');
var example = 'PORT       = PORT      | 3000                   :: Int                                \nHOST       = HOST      | \'satan.com\'            :: String   \nDB_URL     = URL       | \'http://HOST:PORT\'     :: String   \n';
console.log(compile(example));
},{"../nearley/index":6}],17:[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';

var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };

  module.bundle.hotData = null;
}

module.bundle.Module = Module;

var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = '' || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + '61490' + '/');
  ws.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      data.assets.forEach(function (asset) {
        hmrApply(global.parcelRequire, asset);
      });

      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          hmrAccept(global.parcelRequire, asset.id);
        }
      });
      // Clear the console after HMR
      console.clear();
    }

    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');

      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);

      removeErrorOverlay();

      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;

  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';

  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(+k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAccept(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAccept(bundle.parent, id);
  }

  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);

  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAccept(global.parcelRequire, id);
  });
}
},{}]},{},[17,4], null)
//# sourceMappingURL=/pages.5d2f2f57.map