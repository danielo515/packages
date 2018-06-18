'use strict';

const { readdir, writeFile: _writeFile, readFile: _readFile } = require('fs');
const { promisify } = require('util');
const writeFile = promisify(_writeFile);
const readDir = promisify(readdir);
const readFile = promisify(_readFile);
const compile = require('./index');

readFile(require.resolve('./example'), 'utf8').then(compile).then(output => writeFile('env-test.js', output, 'utf8').then(() => output)).then(output => console.log('\n\n--\nCompilation Complete! \n', output));