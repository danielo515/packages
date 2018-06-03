'use strict';

const nearley = require("nearley");
const grammar = require("./grammar.js");
const compiler = require('./compiler');
const { logDeep } = require('../util');

// Create a Parser object from our grammar.
const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

// Parse something!
module.exports = (content) => {

    parser.feed(content);
    // parser.results is an array of possible parsings.
    logDeep(parser.results); // [[[[ "foo" ],"\n" ]]]
    return compiler(parser.results[0]);
};
