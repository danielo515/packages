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

const { compact, map, head, pipe, K, nth } = require('./util');

%}

STATEMENTS -> STATEMENT:+ {% data => { return data[0] }%}

STATEMENT -> ( %INDENT:? (
  FUNCTION   |
  %NEWLINE
)) {% data => data[0][1][0] %}


FUNCTION -> %NAME _ PARAMS %arrow (BLOCK|EXPRESSION)

BLOCK -> (
  (%NEWLINE %INDENT EXPRESSION %DEDENT) |
  (%NEWLINE %INDENT EXPRESSION)
) {% data => ({type: 'BLOCK' , body: data[0][0][2]}) %}

PARAMS ->  (NAME _):* # {% pipe( head, map(head) ) %}
NAME -> %NAME {% head %}
# BLOCK -> %NEWLINE %INDENT STATEMENT:+ {% ([,head, ...tail]) => log('BLock')({head, tail}) %}
# STATEMENT -> %INDENT:? (EXPRESSION | %NEWLINE)
EXPRESSION -> CALL:+ | VAL
CALL -> (%NAME | %keyword) ARGS {% ([[callee],body]) => ({type: 'call', callee, body })%}
ARGS -> (_ VAL):*               {% ([_]) => ({type: 'args', elements: map(nth(1))(_) })%}
VAL -> (%number | %NAME)        {% pipe(id, head) %}
# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_       -> %WS              {% K('WS') %}