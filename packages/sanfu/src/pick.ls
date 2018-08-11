import sanctuary: {map, prop, insert, ap }
import \sanctuary-def : $
import \./define : definitors

{ def } = definitors $
"
/**
 * @namespace Object
 */
/**
 * @function pick
 * @category Object
 * @memberOf Object#
 * @sig [String] -> Object -> Object
 * @param  {Array<String>} paths list of properties you want to pick
 * @return {Object} Object containing only the specified properties
 * @example
 * const pickNameAge = pick (['age', 'name'])
 * pickNameAge({ age: 19, name: 'John', zip: 2819, color: 'red', sex: 'male' }) 
 * // => { age: 19 name: 'John' }
 */"
pick = (paths) ->
    getters = map ((path) -> (prop path) >> (insert path) ), paths
    -> Object.assign ...(ap (ap getters, [it]), [{}])

module.exports = def \sanfu/pick {} [($.Array $.String), $.Function [$.Object,$.Object]] pick

      
      
      