// Generated automatically by nearley, version 2.13.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const nm = require('nearley-moo');
  const tokens = require('./tokens');
  nm(tokens);

const nothing = d => null
const log = label => x  => (console.info(label), console.dir(x,{depth: 10 } ) ,x )

const fn = ([id,,args,arrow,,body]) => ({
    type: 'FunctionDeclaration'
    , id
    , args
    , body
});

const { compact, map, head, pipe } = require('./util');

var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "STATEMENTS$ebnf$1", "symbols": ["STATEMENT"]},
    {"name": "STATEMENTS$ebnf$1", "symbols": ["STATEMENTS$ebnf$1", "STATEMENT"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "STATEMENTS", "symbols": ["STATEMENTS$ebnf$1"], "postprocess":  data => {
          return data[0]
        }},
    {"name": "STATEMENT$subexpression$1$ebnf$1", "symbols": [INDENT], "postprocess": id},
    {"name": "STATEMENT$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "STATEMENT$subexpression$1$subexpression$1", "symbols": ["FUNCTION"]},
    {"name": "STATEMENT$subexpression$1$subexpression$1", "symbols": [NEWLINE]},
    {"name": "STATEMENT$subexpression$1", "symbols": ["STATEMENT$subexpression$1$ebnf$1", "STATEMENT$subexpression$1$subexpression$1"]},
    {"name": "STATEMENT", "symbols": ["STATEMENT$subexpression$1"], "postprocess": data => data[0][1][0]},
    {"name": "FUNCTION", "symbols": [NAME, "_", "PARAMS", arrow, "BLOCK"]},
    {"name": "BLOCK$subexpression$1$subexpression$1$ebnf$1", "symbols": ["STATEMENT"]},
    {"name": "BLOCK$subexpression$1$subexpression$1$ebnf$1", "symbols": ["BLOCK$subexpression$1$subexpression$1$ebnf$1", "STATEMENT"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "BLOCK$subexpression$1$subexpression$1", "symbols": [NEWLINE, INDENT, "BLOCK$subexpression$1$subexpression$1$ebnf$1", DEDENT]},
    {"name": "BLOCK$subexpression$1", "symbols": ["BLOCK$subexpression$1$subexpression$1"]},
    {"name": "BLOCK$subexpression$1$subexpression$2$ebnf$1", "symbols": ["STATEMENT"]},
    {"name": "BLOCK$subexpression$1$subexpression$2$ebnf$1", "symbols": ["BLOCK$subexpression$1$subexpression$2$ebnf$1", "STATEMENT"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "BLOCK$subexpression$1$subexpression$2", "symbols": [NEWLINE, INDENT, "BLOCK$subexpression$1$subexpression$2$ebnf$1"]},
    {"name": "BLOCK$subexpression$1", "symbols": ["BLOCK$subexpression$1$subexpression$2"]},
    {"name": "BLOCK", "symbols": ["BLOCK$subexpression$1"], "postprocess": data => data[0][0][2]},
    {"name": "PARAMS$ebnf$1", "symbols": []},
    {"name": "PARAMS$ebnf$1$subexpression$1", "symbols": ["NAME", "_"]},
    {"name": "PARAMS$ebnf$1", "symbols": ["PARAMS$ebnf$1", "PARAMS$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PARAMS", "symbols": ["PARAMS$ebnf$1"], "postprocess": pipe( head, map(head) )},
    {"name": "NAME", "symbols": [NAME], "postprocess": head},
    {"name": "STATEMENT$ebnf$1", "symbols": [INDENT], "postprocess": id},
    {"name": "STATEMENT$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "STATEMENT$subexpression$2", "symbols": ["EXPRESSION"]},
    {"name": "STATEMENT$subexpression$2", "symbols": [NEWLINE]},
    {"name": "STATEMENT", "symbols": ["STATEMENT$ebnf$1", "STATEMENT$subexpression$2"]},
    {"name": "BODY$ebnf$1", "symbols": ["BLOCK"]},
    {"name": "BODY$ebnf$1", "symbols": ["BODY$ebnf$1", "BLOCK"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "BODY", "symbols": ["BODY$ebnf$1"]},
    {"name": "EXPRESSION$ebnf$1", "symbols": ["CALL"]},
    {"name": "EXPRESSION$ebnf$1", "symbols": ["EXPRESSION$ebnf$1", "CALL"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "EXPRESSION", "symbols": ["EXPRESSION$ebnf$1"]},
    {"name": "CALL$subexpression$1", "symbols": [NAME]},
    {"name": "CALL$subexpression$1", "symbols": [keyword]},
    {"name": "CALL", "symbols": ["CALL$subexpression$1", "ARGS"]},
    {"name": "ARGS$ebnf$1", "symbols": []},
    {"name": "ARGS$ebnf$1$subexpression$1", "symbols": ["_", "VAL"]},
    {"name": "ARGS$ebnf$1", "symbols": ["ARGS$ebnf$1", "ARGS$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ARGS", "symbols": ["ARGS$ebnf$1"], "postprocess": _ => ({type: 'args', elements: _ })},
    {"name": "VAL", "symbols": [number]},
    {"name": "VAL", "symbols": [NAME]},
    {"name": "_", "symbols": [WS], "postprocess": nothing},
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", WS], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": nothing}
]
  , ParserStart: "STATEMENTS"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
