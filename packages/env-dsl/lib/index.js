'use strict';

const nearley = require("nearley");
const grammar = require("./grammar.js");
const compiler = require('./compiler');
const { logDeep } = require('../util');

// Parse something!
module.exports = content => {

    // Create a Parser object from our grammar.
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(content);
    // parser.results is an array of possible parsings.
    logDeep(parser.results);
    return compiler(parser.results[0]);
};