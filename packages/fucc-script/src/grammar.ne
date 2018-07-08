@{%
	const join = sep => arr => arr.join(sep)
	const map = fn => arr => arr.map(fn)
	const nth = pos => arr => arr[pos]
	const head = arr => arr[0]
	const pipe = ( ...fns ) => x => fns.reduce((x,f) => f(x) , x)
	const filter = fn => arr => arr.filter(fn)
	const predR = regex => x => regex.test(x)
	const notnull = x => x != null
	const log = (...x) => (console.info(...x), x)
	const toInt = x => x | 0
	const _true = () => true
	const _false = () => false
	const nothing = d => null
	const compact = filter(notnull)
	const oBind = base => ext => Object.assign({}, base, ext)
	const option = oBind({type:'option'})
	const push = arr => x => arr.push(x) && arr
    const concat = arr => arr2 => arr.concat(arr2)
    const K = v => _ => v
%}

main -> statement __
statement -> FUNCTION

FUNCTION -> NAME _ (NAME _):* ARROW _ BODY NL
BODY -> BODY | NL BLOCK:+ EXPRESSION
NAME -> [a-zA-Z] [a-zA-Z_-]:* {% pipe( ([h,t]) => [h].concat(t), join('')) %}
EXPRESSION -> VAL | CALL
CALL -> (NAME|KW) (_ VAL):*
LAMBDA -> "(" (DOT NAME | ARROW _ EXPRESSION) __ ")"
KW -> "map" | "filter" | "reduce" | "it" | "-" | "+" | "*" | "/"
ARROW -> "->"
P -> "(" __ EXPRESSION __ ")"
BLOCK -> _ _                   {% K('BLOCK') %} 
VAL -> (OBJECT|ARR|NUM|LAMBDA) {% id %} 
OBJECT -> NAME ":" _ VAL
ARR -> "[" (_ VAL _):* "]"
DOT -> "."


NUM     -> [0-9]:+ UNIT   {% id %} 
STR     -> "'" [^']:* "'"  {% id %} 
UNIT    -> [a-z]:*

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_       -> [ ]              {% nothing %}
__		-> [ ]:*           {% nothing %}
NL      -> [\n]             {% nothing %}