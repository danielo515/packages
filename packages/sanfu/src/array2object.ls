import sanctuary: { flip, singleton, foldMap }
import \sanctuary-def : $
import \./define : definitors

{ def, a } = definitors $
"
/**
 * @function array2object
 * @param  {Any} value The value that will be assigned to every key
 * @param  {String[]} keys An array of strings that will be used as keys
 * @return {Object} an object containing all the provided strings as keys with the provided value
 * @memberOf Array#
 * @sig a -> [String] -> StrMap a
 * @category Transformation
 * @description 
 * Takes a value and an array of strings and merges them into a single object.
 * The provided value will be the value of all the keys.
 * This function may be useful when building things like projections, where you have a list of fields you want to include
 * and the semantics require an object with those fields set to a value (ej 1 or true)
 * @example
 * // This is an example using mongodb projection semantics
 * const toProject = ['name','age']
 * const projectFields = array2object (1)
 * const projection = projectFields (toProject)
 * // => {name: 1, age: 1}
 * 
 */"
array2object = (value) ->
    foldMap Object, (flip singleton) value

definition = def \sanfu/array2object {} [a, ($.Array $.String), $.StrMap a ] array2object

export {definition, array2object} 