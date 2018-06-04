'use strict';
/**
 * READY FOR BE COMPILED WITH PARCEL
 */

const compile = require('../nearley/index');
const output = document.getElementById('output');
const input = document.getElementById('input');
const errorsDom = document.getElementById('compile-errors');
const compileButton = document.getElementById('compile');

const outputEditor = CodeMirror.fromTextArea(output, {
     lineNumbers: true
    , mode:  "javascript"
    , theme: "abcdef"
});

const inputCodeMirror = CodeMirror.fromTextArea(input, {
    lineNumbers: true
    , mode:  "javascript"
    , theme: "abcdef"
});

const errors = CodeMirror.fromTextArea(errorsDom, {
    theme: "abcdef"
});

const compileAction = () => {
    const inputText = inputCodeMirror.getValue()
    errors.setValue('')
    try{
        outputEditor.setValue(compile(inputText))
    } catch (err) {
        errors.setValue(err.message)
    }
}

compileButton.addEventListener('click', compileAction);
compileAction();