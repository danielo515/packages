import \sanctuary-def : $
import \./define : definitors

{ def } = definitors $

"
/**
* General purpose utilities
* @namespace Utils
*/
/**
 * @function tap
 * @memberOf Utils#
 * @category Function
 * @description 
 * ```
 * tap :: (* -> *) -> a -> a
 * ```
 * Wraps a function and returns a new function that will take **any** parameter, pass it to the
 * wrapped function which return value will be ignored and ther returns the given value.
 * It could be useful to introduce logging into pipelines and/or execute functions with side effects without interfering the pipeline
 * @param  {Function} f A function to be wrapped by tap
 * @param  {Any} x      A value that will be passed to the wrapped function and then returned
 * @return {Any} Returns the input untouched
 */
 "
function tap f, x
    f x
    x


module.exports = def \sanfu/tap {} [$.AnyFunction, $.Any, $.Any] tap
