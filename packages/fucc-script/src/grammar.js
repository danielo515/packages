// Generated automatically by nearley, version 2.13.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const lexer = require('./lexer.js');
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "FUNCTION$ebnf$1", "symbols": []},
    {"name": "FUNCTION$ebnf$1$subexpression$1", "symbols": [(lexer.has("NAME") ? {type: "NAME"} : NAME), (lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "FUNCTION$ebnf$1", "symbols": ["FUNCTION$ebnf$1", "FUNCTION$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FUNCTION", "symbols": [(lexer.has("NAME") ? {type: "NAME"} : NAME), (lexer.has("WS") ? {type: "WS"} : WS), "FUNCTION$ebnf$1", (lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "OBJECT", "symbols": [(lexer.has("property") ? {type: "property"} : property), (lexer.has("WS") ? {type: "WS"} : WS), "VAL"]},
    {"name": "VAL$subexpression$1", "symbols": ["FUNCTION"]},
    {"name": "VAL$subexpression$1", "symbols": ["OBJECT"]},
    {"name": "VAL", "symbols": ["VAL$subexpression$1"]}
]
  , ParserStart: "FUNCTION"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
