'use strict';

const { map, compose, prop, joinWith } = require('sanctuary');

const runtime = {
    JSON: ''
    , String: ''
    , Integer: ''
};

const declare = ({name}) => `const ${name} = `
const extract = ({path}) => ` process.env['${path}'] `
const defaults = x => '| ' + map(prop('val'), x).join(' |')

const cascade = f => val => [ val, f(val) ]

const compile = ( trees ) => {
    const paths      = ['body', 'defaults',''];
    const processors = [extract, defaults]

    const compileExpression = 
        tree => 
            paths.reduce(
                ( [acc, obj, processor], nxPath, i) => [ [...acc, processor(obj) ], obj[nxPath], processors[i] ]
                , [[], tree, declare ])[0]
    
    
    
    return map(joinWith(''), trees.map(compileExpression))
}


module.exports = compile;