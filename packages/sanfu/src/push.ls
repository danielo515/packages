import \sanctuary-def : $
import \./define : definitors

{ def } = definitors $

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


module.exports = def \sanfu/push {} [($.Array $.Any), $.Any] push
