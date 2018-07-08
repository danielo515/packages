'use strict';

const nearley = require("nearley");
const grammar = require("./grammar.js");
const nearleyMoo = require ('nearley-moo');
const lexer = require('./lexer');

module.exports = () => {
  const parser = nearleyMoo.parser(nearley, grammar, lexer);
  parser.ignore('COMMENT');
  return { parser };
};

// const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));