'use strict';

const nearley = require("nearley");
const grammar = require("./grammar.js");
const { readdir, writeFile:_writeFile, readFile: _readFile } = require('fs');
const { promisify } = require('util');
const { resolve } = require('path');
const writeFile = promisify(_writeFile);
const readDir = promisify(readdir);
const readFile = promisify(_readFile);
const {logDeep} = require('../util');
const compiler = require('./compiler');

// Create a Parser object from our grammar.
const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

// Parse something!
readFile(require.resolve('./example'),'utf8')
.then((content) => {

    parser.feed(content);
    // parser.results is an array of possible parsings.
    logDeep(parser.results); // [[[[ "foo" ],"\n" ]]]
    logDeep(compiler(parser.results[0]))
});
