@{%
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

%}

main -> %NEWLINE | FUNCTION
FUNCTION -> %NAME _ PARAMS %arrow BLOCK
PARAMS ->  (NAME _):* {% pipe( head, map(head) ) %}
NAME -> %NAME {% head %}
BLOCK -> %NEWLINE %INDENT STATEMENT:+ {% ([,head, ...tail]) => log('BLock')({head, tail}) %}
STATEMENT -> %INDENT:? (EXPRESSION | %NEWLINE)
BODY -> BLOCK:+
EXPRESSION -> CALL:+
CALL -> (%NAME | %keyword) ARGS {% log('CALLEE') %}
ARGS -> (_ VAL):* {% _ => ({type: 'args', elements: _ })%}
VAL -> %number | %NAME
# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_       -> %WS              {% nothing %}
__		-> %WS:*			{% nothing %}