import sanctuary: { prop }
import \sanctuary-def : $
import \./define : definitors

{ def, a, b } = definitors $

"
/**
 * @function takeAction
 * @param  {Function} defaultAction The default action to execute if nothing matches
 * @param  {Object} options An object containing functions to execute when the property of the object matches
 * @param  {String} field A property on the input object to select wich action to take
 * @param  {Object} item An object to execute an action on, looking at the provided field and searching for it on the actions map
 * @return {Any} The return value of the selected option executed on the input object
 * @memberOf Object#
 * @sig (a -> b) -> StrMap (a -> b) -> String -> Object -> b
 * @category Logic
 * @description 
 * Creates a function that takes an object and executes one action on it. 
 * The action is selected looking at the value of the property `field` and searching for it on the map of actions. If no action matches then the default action is executed on the input object
 * Please note that it only works on objects, so it is intended to execute actions on objects based on one of the object's properties
 * @example
 * const options = { admin: u => ({...u, superPowers: true })
 *                 , user: ({...u, superPowers: false }) 
 *                 };
 * const defaultAction = x => ({...x, banned: true})
 * const registerUser = takeAction (defaultAction) (options) ('role')
 *
 * registerUser ({name:'Daniel', age: 18, role: 'admin' }) // => {name:'Daniel', age: 18, role: 'admin', superPowers: true }
 * registerUser ({name:'NoBody', age: 18, role:'no-role'}) // => {name:'NoBody', age: 18, role:'no-role', banned: true}
 */"
takeAction = (defaultAction, actions, field) ->
    p = prop field
    (msg) ->
        action = actions[p msg] or defaultAction
        action msg

FN = $.Function [a, b]
definition = def \sanfu/takeAction {} [FN, ($.StrMap FN), $.String, $.Object, b ] takeAction

export {definition, takeAction}
