import sanctuary: {unchecked, prop, map, ap, insert, flip, pipe, compose:B, singleton, foldMap }
import \sanctuary-def : $
import \./define : definitors
export \./indexBy : indexBy
export \./push : push
export \./tap : tap
export \./pick : pick

{reduce} = unchecked

{a,b,c, Fn, def} = definitors $

function push_ arr, x
    arr.push x
    arr

objAcc = (init, o) -> {...init, ...o}

function pipeAcc fns
    acc = push_ []
    reducer = (p, f) -> p.then f . acc
    (x) -> reduce reducer, (Promise.resolve x), fns

function apply f, args
    f ...args

log = (label,x) ->
    apply console.log, [label, x]



inspect = (logger,label, fn, x) ->
    apply logger, [label, x]
    fn x

function starling f, g, a
    f a, g a

S = def \sanfu/starling {} [ (Fn a, (Fn b, c)) , (Fn a, b) , a , c ] starling

exporting =
    inspect: def \sanfu/inspect {} [$.AnyFunction, $.String, $.AnyFunction, $.Any, $.Any] inspect
    pipeAcc: def \sanfu/promise/pipeAcc {} [($.Array $.AnyFunction), $.AnyFunction] pipeAcc
    apply: def \sanfu/apply {} [$.AnyFunction, $.Function [($.Array $.Any), $.Any]] apply
    starling: S
    S: S

module.exports <<< exporting 

"/**
* @module Sanfu
*/
"