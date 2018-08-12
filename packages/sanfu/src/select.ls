import sanctuary: {prop }
import \sanctuary-def : $
import \./define : definitors

{ def, a } = definitors $
"
/**
 * @function select
 * @param  {Any} defaultVal The default value to return if nothing matches
 * @param  {Object} options An object containing the options to consider
 * @param  {String} field which field determines the classification of the input object
 * @param  {Object} item An object to clasify looking at the provided field and searching for it on the options map
 * @return {Any} The selected option or the default value
 * @memberOf Object#
 * @sig a -> StrMap a -> String -> Object -> a
 * @category Logic
 * @description 
 * Creates a function that takes an object and selects one value from a map of options or returns the default value.
 * Please note that it only works on objects, so it is intended to clasify objects or select values based on object's properties
 * @example
 * const options = {'Joe':'admin','Daniel':'user'};
 * const showRole = select ('non-user') (options) ('name')
 * showRole ({name:'Daniel', age: 18}) // => 'user'
 * showRole ({name:'NoBody', age: 18}) // => 'non-user'
 */"
select = (defaultVal, options, field) ->
    p = prop field
    (msg) -> options[p msg] or defaultVal


definition = def \sanfu/select {} [a, ($.StrMap a), $.String, $.Object, a ] select

export {definition, select}