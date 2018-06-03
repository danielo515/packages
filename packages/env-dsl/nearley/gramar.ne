@{%
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
%}

PROGRAM 	-> LINE (ln LINE {% nth(1) %}):* {% ([a,b]) => [a,...b] %}

LINE 		-> NAME _ 
			   "="  _
			   DECLARATION _ 
			   "::" _ 
			   TYPE __ 				
			   {% ([[name],,,, body,,,,[coerceTo] ]) => ({type:'declaration', name, body, coerceTo }) %}

NAME        -> WORD
DECLARATION -> WORD DEFAULT:* 		{% ([path, defaults]) => ({ path, defaults }) %}
DEFAULT     -> _ "|" _ VALUE 		{% pipe(nth(3),([val]) => option({val})) %}
VALUE       -> BOOL | NUM | STR | EXPRESSION



OPERATOR -> "file" {% id %}
EXPRESSION -> OPERATOR _ (STR|WORD) {% ([operator,_,args])=>({type:'expression', operator, args }) %}
BOOL 		-> 
      [Yy] [eE] [sS]		{% _true %}
    | [nN] [oO] 			{% _false %}
    | "true" 				{% _true %}
    | "false"               {% _false %}

WORD    -> [a-zA-Z_]:+      {% pipe( map(join('')),head) %}
NUM     -> [0-9_]:+ UNIT    {% pipe( head,filter(predR(/[^_]/)),join(''),toInt) %}
STR     -> "'" [^']:* "'"   {% pipe( nth(1),join('')) %}
UNIT    -> [a-z]:*
TYPE    -> "Int" | "Boolean" | "String" | "JSON"

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_       -> [ ]:+            {% nothing %}
__		-> [\s]:*			{% nothing %}
ln  -> "\r":? "\n"          {% nothing %}