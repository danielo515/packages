'use strict';
import { it } from 'param.macro'

const { map, toLower, prop, joinWith, pipe, concat, __ } = require('sanctuary');

const runtime = {
    JSON: ''
    , String: ''
    , Integer: ''
};

const declare = `const ${it.name} = `
const extract = ({ path }) => ` process.env['${path}'] `
const templateStr = `\${${it}}`
// const assign = base => x => Object.assign({}, base, x )
// const getWords = str => tail( str.match(/[a-z_]*/ig) )
const templateExports = `module.exports = { ${ it.join(', ') } }`
const processString = seen => ({ raw, val }) => {
    if (raw) {
        return `'${val}'`
    }
    return '`' + seen.reduce((acc, x) => acc.replace(x, templateStr(x)), val) + '`'

    
}
const processDefault = seen => {
    const str = processString(seen);
    return def => {
        switch (def.type) {
            case 'string':
                return str(def)
            case 'integer':
            case 'boolean':
            default:
                return def.val
        }
    }
}
const processDefaults = seen => x => '|| ' + map(processDefault(seen), x).join(' ||')

const compile = (trees) => {

    const symbols = (map(prop('name'), trees)); // Hoist symbols

    const compileExpression =
        tree => {

            const { body, coerceTo } = tree;
            const type = toLower(coerceTo);
            const defaults = map(({ val }) => ({ type, val }), body.defaults);
            console.log(defaults)
            return [
                declare(tree)
                , extract(body)
                , processDefaults(symbols)(defaults)
            ]
        }


    return pipe
    ([
          map(compileExpression)
          , map(joinWith(''))
          , joinWith(';\n')
          , concat(__, `\n${templateExports(symbols)};\n`)
          , concat(`'use strict;'\n`)
    ])(trees)
}


module.exports = compile;