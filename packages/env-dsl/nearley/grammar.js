// Generated automatically by nearley, version 2.13.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

	const join = sep => arr => arr.join(sep)
	const map = fn => arr => arr.map(fn)
	const nth = pos => arr => arr[pos]
	const head = arr => arr[0]
	const pipe = ( ...fns ) => x => fns.reduce((x,f) => f(x) , x)
	const filter = fn => arr => arr.filter(fn)
	const predR = regex => x => regex.test(x)
	const notnull = x => x != null
	const log = x => console.info(x) || x
	const toInt = x => x | 0
	const _true = () => true
	const _false = () => false
	const nothing = d => null
	const compact = filter(notnull)
	const oBind = base => ext => Object.assign({}, base, ext)
	const option = oBind({type:'option'})
	const push = arr => x => arr.push(x) && arr
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "PROGRAM$ebnf$1", "symbols": []},
    {"name": "PROGRAM$ebnf$1$subexpression$1", "symbols": ["ln", "LINE"], "postprocess": nth(1)},
    {"name": "PROGRAM$ebnf$1", "symbols": ["PROGRAM$ebnf$1", "PROGRAM$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PROGRAM", "symbols": ["LINE", "PROGRAM$ebnf$1"], "postprocess": ([a,b]) => [a,...b]},
    {"name": "LINE$string$1", "symbols": [{"literal":":"}, {"literal":":"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "LINE", "symbols": ["NAME", "_", {"literal":"="}, "_", "DECLARATION", "_", "LINE$string$1", "_", "TYPE", "__"], "postprocess": ([[name],,,, body,,,,[coerceTo] ]) => ({type:'declaration', name, body, coerceTo })},
    {"name": "NAME", "symbols": ["WORD"]},
    {"name": "DECLARATION$ebnf$1", "symbols": []},
    {"name": "DECLARATION$ebnf$1", "symbols": ["DECLARATION$ebnf$1", "DEFAULT"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "DECLARATION", "symbols": ["WORD", "DECLARATION$ebnf$1"], "postprocess": ([path, defaults]) => ({ path, defaults })},
    {"name": "DEFAULT", "symbols": ["_", {"literal":"|"}, "_", "VALUE"], "postprocess": pipe(nth(3),([val]) => option({val}))},
    {"name": "VALUE", "symbols": ["BOOL"]},
    {"name": "VALUE", "symbols": ["NUM"]},
    {"name": "VALUE", "symbols": ["STR"]},
    {"name": "VALUE", "symbols": ["EXPRESSION"]},
    {"name": "OPERATOR$string$1", "symbols": [{"literal":"f"}, {"literal":"i"}, {"literal":"l"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "OPERATOR", "symbols": ["OPERATOR$string$1"], "postprocess": id},
    {"name": "EXPRESSION$subexpression$1", "symbols": ["STR"]},
    {"name": "EXPRESSION$subexpression$1", "symbols": ["WORD"]},
    {"name": "EXPRESSION", "symbols": ["OPERATOR", "_", "EXPRESSION$subexpression$1"], "postprocess": ([operator,_,args])=>({type:'expression', operator, args })},
    {"name": "BOOL", "symbols": [/[Yy]/, /[eE]/, /[sS]/], "postprocess": _true},
    {"name": "BOOL", "symbols": [/[nN]/, /[oO]/], "postprocess": _false},
    {"name": "BOOL$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "BOOL", "symbols": ["BOOL$string$1"], "postprocess": _true},
    {"name": "BOOL$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "BOOL", "symbols": ["BOOL$string$2"], "postprocess": _false},
    {"name": "WORD$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "WORD$ebnf$1", "symbols": ["WORD$ebnf$1", /[a-zA-Z_]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "WORD", "symbols": ["WORD$ebnf$1"], "postprocess": pipe( map(join('')),head)},
    {"name": "NUM$ebnf$1", "symbols": [/[0-9_]/]},
    {"name": "NUM$ebnf$1", "symbols": ["NUM$ebnf$1", /[0-9_]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "NUM", "symbols": ["NUM$ebnf$1", "UNIT"], "postprocess": pipe( head,filter(predR(/[^_]/)),join(''),toInt)},
    {"name": "STR$ebnf$1", "symbols": []},
    {"name": "STR$ebnf$1", "symbols": ["STR$ebnf$1", /[^']/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "STR", "symbols": [{"literal":"'"}, "STR$ebnf$1", {"literal":"'"}], "postprocess": pipe( nth(1),join(''))},
    {"name": "UNIT$ebnf$1", "symbols": []},
    {"name": "UNIT$ebnf$1", "symbols": ["UNIT$ebnf$1", /[a-z]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "UNIT", "symbols": ["UNIT$ebnf$1"]},
    {"name": "TYPE$string$1", "symbols": [{"literal":"I"}, {"literal":"n"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "TYPE", "symbols": ["TYPE$string$1"]},
    {"name": "TYPE$string$2", "symbols": [{"literal":"B"}, {"literal":"o"}, {"literal":"o"}, {"literal":"l"}, {"literal":"e"}, {"literal":"a"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "TYPE", "symbols": ["TYPE$string$2"]},
    {"name": "TYPE$string$3", "symbols": [{"literal":"S"}, {"literal":"t"}, {"literal":"r"}, {"literal":"i"}, {"literal":"n"}, {"literal":"g"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "TYPE", "symbols": ["TYPE$string$3"]},
    {"name": "TYPE$string$4", "symbols": [{"literal":"J"}, {"literal":"S"}, {"literal":"O"}, {"literal":"N"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "TYPE", "symbols": ["TYPE$string$4"]},
    {"name": "_$ebnf$1", "symbols": [/[ ]/]},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[ ]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": nothing},
    {"name": "__$ebnf$1", "symbols": []},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": nothing},
    {"name": "ln$ebnf$1", "symbols": [{"literal":"\r"}], "postprocess": id},
    {"name": "ln$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ln", "symbols": ["ln$ebnf$1", {"literal":"\n"}], "postprocess": nothing}
]
  , ParserStart: "PROGRAM"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
