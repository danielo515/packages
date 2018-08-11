import sanctuary: {prop, ap, flip, singleton, foldMap }
import \sanctuary-def : $
import \./define : definitors

{ def } = definitors $
"
/**
 * @function indexBy
 * @category List
 * @memberOf Array#
 * @sig String -> [Object] -> Object
 * @param  {String} key String representing the key you want to index by
 * @return {Object} Hashmap containing all the objects of the array indexed by the `key` property
 * @example
 * const indexByName = indexBy ('name')
 * indexByName([{name:'joe', age: 12 },{name:'peter', age:15}]) 
 * // => {joe: {age: 12, name: 'joe'}, peter: {age: 15, name: 'peter'}}
 */"
indexBy = (key) ->
    foldMap Object, (ap flip singleton) prop key

module.exports = def \sanfu/indexBy {} [$.String, ($.Array $.Object), $.Object] indexBy