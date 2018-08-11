import \./apply : {apply}
"
/**
 * @function log
 * @param  {String} label What should be shown before logging to console
 * @param  {Any} x Anything that will be logged to the console
 * @return {Any} The latest argument `x` untouched
 * @memberOf Utils#
 * @category Function
 * @sig String -> a -> a
 * @description 
 * This is a small utility that is not intended to be used for anything but tests or just fast checks.
 * It uses `console.log` to output whatever it gets along with the provided label (AKA title), then it returns
 * the same thing logged to console.
 * For a better alternative, suitable for more serious tasks take a loop at {@link inspect}
 * @example
 * pipe([
 *   log ('First step') // logs  {name: 'Joe', age: '19'} to console
 *   , prop('name')
 *   , log ('Second step') // logs `Joe` to console 
 * ])({name: 'Joe', age: '19'})
 */"
log = (label,x) ->
    apply console.log, [label, x]


export {log}