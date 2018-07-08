'use strict';

const join = sep => arr => arr.join(sep)
const map = fn => arr => arr.map(fn)
const nth = pos => arr => arr[pos]
const head = arr => arr[0]
const pipe = ( ...fns ) => x => fns.reduce((x,f) => f(x) , x)
const filter = fn => arr => arr.filter(fn)
const predR = regex => x => regex.test(x)
const notnull = x => x != null
const log = (...x) => (console.info(...x), x)
const toInt = x => x | 0
const _true = () => true
const _false = () => false
const nothing = d => null
const compact = filter(notnull)
const oBind = base => ext => Object.assign({}, base, ext)
const option = oBind({type:'option'})
const push = arr => x => arr.push(x) && arr
const concat = arr => arr2 => arr.concat(arr2)
const K = v => _ => v

module.exports = {
    compact, join, map, head, pipe, filter, notnull, push, concat,K, nth
}