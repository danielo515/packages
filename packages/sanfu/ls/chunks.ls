
require! \sanctuary-def : $
require! \./define : definitors

{ def, a } = definitors $


/**
 * @function chunks
 * @param  {Number} size the size of each chunk
 * @param  {Array} arr an array you want to split into chunks
 * @return {Array[]} an array of arrays of the provided size
 * @memberOf Array#
 * @sig FiniteNumber -> [a] -> [[a]]
 * @category Transformation
 * @description 
 * Creates an array of elements split into groups the length of size.
 * If array can't be split evenly, the last chunk will be the remaining elements.
 * A chunk size bigger than the size of the array will just return the original array wrapped
 * @example
 * const elements = [1,2,3,4,5,6]
 * chunks (3) (elements)
 * // => [[1,2,3],[4,5,6]]
 * chunks (4) (elements)
 * // => [[1,2,3,4],[5,6]]
 */
chunks = (size) -> -> 
    do 
        it.slice 0 size
    while (it = it.slice size).length

definition = (((def \sanfu/chunks) {}) [$.FiniteNumber, ($.Array a), $.Array $.Array a ]) chunks

module.exports = definition


