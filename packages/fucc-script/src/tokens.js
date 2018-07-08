'use strict';

module.exports = {
      WS:      /[\t ]+/
    , COMMENT: /\/\/.*?$/
    , number:  /0|[1-9][0-9_]*[a-z]*/
    , NAME: /[a-zA-Z_]+/
    , lparen:  '('
    , rparen:  ')'
    , property: /[a-zA-Z]+:/
    , dot: '.'
    , arrow: /[\t ]*->[\t ]*/
    , underscore: / _ /
    , INDENT: /^[\t ]+/
    , DEDENT: 'DEDENT'
    , keyword: ['map', 'reduce', 'else', 'it']
    , NEWLINE: { match: /\n/, lineBreaks: true }
};