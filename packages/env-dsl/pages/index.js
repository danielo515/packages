'use strict';
/**
 * READY FOR BE COMPILED WITH PARCEL
 */

const compile = require('../nearley/index');
const output = document.getElementById('output');
const input = document.getElementById('input');
const compileButton = document.getElementById('compile');

const outputEditor = CodeMirror.fromTextArea(output, {
     lineNumbers: true
    , mode:  "javascript"
});

const inputCodeMirror = CodeMirror.fromTextArea(input, {
    lineNumbers: true
    , mode:  "javascript"
});

const compileAction = () => {
    const inputText = inputCodeMirror.getValue()
    outputEditor.setValue(compile(inputText))
}

compileButton.addEventListener('click', compileAction);
compileAction();