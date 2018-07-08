'use strict';

module.exports = {
      COMMENT: /\/\/.*?$/
    , number:  /0|[1-9][0-9_]*[a-z]*/
    , NAME: /[a-zA-Z_]+/
    , lparen:  '('
    , rparen:  ')'
    , property: /[a-zA-Z]+:/
    , dot: '.'
    , underscore: / _ /
    , INDENT: /^[\t ]+/
    , DEDENT: 'DEDENT'
    , WS:      /[ ]/
    , arrow: /[\t ]*->[\t ]*/
    , keyword: ['map', 'reduce', 'else', 'it']
    , NEWLINE: { match: /[\r\n]/, lineBreaks: true, }
};