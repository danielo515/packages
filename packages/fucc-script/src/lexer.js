const moo = require('moo')

const lexer = moo.compile({
    WS:      /[ \t]+/
    , comment: /\/\/.*?$/
    , number:  /0|[1-9][0-9_]*[a-z]*/
    , NAME: /[a-zA-Z_]+/
    , string:  /"(?:\\["\\]|[^\n"\\])*"/
    , lparen:  '('
    , rparen:  ')'
    , property: /[a-zA-Z]:/
    , arrow: '->'
    , keyword: ['while', 'if', 'else', 'it']
    , NL:      { match: /\n/, lineBreaks: true },
})

module.exports = lexer;