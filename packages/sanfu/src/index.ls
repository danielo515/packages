import sanctuary: {unchecked, prop, map, ap, insert, flip, pipe, compose:B, singleton, foldMap }
import \sanctuary-def : $
import \./define : definitors

{reduce} = unchecked
prod = /production/i .test process.env.NODE_ENV
def = $.create checkTypes:not prod, env: $.env

{a,b,c, Fn} = definitors $
"
/**
* Utils targeted to array type
* @namespace Array
*/

/**
 * @function push
 * @memberOf Array
 * @category List
 * @description 
 * ```
 * push :: [a] -> a -> [a]
 * ```
 * @param  {Array} arr The array to use as base to push any element
 * @param  {Any} x Any kind of item that will be pushed into the array
 * @return {Array} The array with a new element at the end
 */
"
function push arr, x
    [...arr, x]

function push_ arr, x
    arr.push x
    arr

"
/**
 * Sanctuary functional utilities
 * @module sanfu
 */
"
objAcc = (init, o) -> {...init, ...o}

function pipeAcc fns
    acc = push_ []
    reducer = (p, f) -> p.then f . acc
    (x) -> reduce reducer, (Promise.resolve x), fns

"
/**
 * @function tap
 * @description 
 * ```
 * tap :: (* -> *) -> a -> a
 * ```
 * Wraps a function and returns a new function that will take **any** parameter, pass it to the
 * wrapped function which return value will be ignored and ther returns the given value.
 * It could be useful to introduce logging into pipelines and/or execute functions with side effects without interfering the pipeline
 * @param  {Function} f A function to be wrapped by tap
 * @param  {Any} x      A value that will be passed to the wrapped function and then returned
 * @return {Any} {description}
 */
 "
function tap f, x
    f x
    x

function apply f, args
    f ...args

log = (label,x) ->
    apply console.log, [label, x]

pick = (paths) ->
    getters = map ((path) -> (prop path) >> (insert path) ), paths
    -> Object.assign ...(ap (ap getters, [it]), [{}])

inspect = (logger,label, fn, x) ->
    apply logger, [label, x]
    fn x

function starling f, g, a
    f a, g a

indexBy = (key) ->
    foldMap Object, (ap flip singleton) prop key

S = def \sanfu/starling {} [ (Fn a, (Fn b, c)) , (Fn a, b) , a , c ] starling

module.exports = 
    tap: def \sanfu/tap {} [$.AnyFunction, $.Any, $.Any] tap
    inspect: def \sanfu/inspect {} [$.AnyFunction, $.String, $.AnyFunction, $.Any, $.Any] inspect
    pipeAcc: def \sanfu/promise/pipeAcc {} [($.Array $.AnyFunction), $.AnyFunction] pipeAcc
    push: def \sanfu/push {} [($.Array $.Any), $.Any] push
    pick: def \sanfu/pick {} [($.Array $.String), $.Function [$.Object,$.Object]] pick
    apply: def \sanfu/apply {} [$.AnyFunction, $.Function [($.Array $.Any), $.Any]] apply
    starling: S
    S: S
    indexBy: def \sanfu/indexBy {} [$.String, ($.Array $.Object), $.Object] indexBy
