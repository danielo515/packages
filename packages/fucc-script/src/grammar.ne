@{%
const lexer = require('./lexer.js');
%}

@lexer lexer

FUNCTION -> %NAME %WS (%NAME %WS):* %NL
OBJECT -> %property %WS VAL
VAL -> (FUNCTION|OBJECT)