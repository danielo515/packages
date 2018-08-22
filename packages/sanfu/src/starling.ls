import \sanctuary-def : $
import \./define : definitors

{ Fn, a, b, c, def } = definitors $

"
/**
 * @function starling
 * @param  {Function} f Any binary function
 * @param  {Function} g Any unary function
 * @param  {Any} a Any value
 * @return {Any} 
 * @memberOf Combinators#
 * @sig (a -> b -> c) -> (a -> b) -> a -> c
 * @category Function
 * @description 
 * The staring combinator takes a binary function, an unary function and a value. 
 * It then applies the first function to the provided value and the result of applying the second function to that same value
 * @example
 * const add = a => b => a + b
 * const something = a => a * 9
 * S (add) (something) (2) 
 * // => 20
 * 
 */
"
function starling f, g, a
    f a, g a

S = def \sanfu/starling {} [ (Fn a, (Fn b, c)) , (Fn a, b) , a , c ] starling

module.exports = S