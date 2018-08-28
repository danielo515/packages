import \./define : definitors
import \sanctuary-def : $
import \./apply : {apply}

{ def } = definitors $
"
/**
 * @function spy
 * @param  {Logger} logger A logger instance to use
 * @param  {String} label Which label should be added to each log output
 * @return {Any} The provided value with fn applied to it
 * @memberOf Utils#
 * @sig Function f => Logger -> String -> (a -> b) -> a -> b
 * @category Function
 * @description 
 * This function is inteded to be used to wrap other unary functions and take a look on what are they getting as input.
 * The input will be logged using the provided logger and the inspected function will be applied to it, the result is what will be returned
 * Please note that the wrapped functions must be unary.
 * @example
 * const addOne = a => a + 1
 * const divedeBy2 = a => a / 2
 * pipe([
 * spy('About to add one:')(addOne) // When executed logs 1 then returns 2
 * , spy('About to divide:')(divideBy2) // When executed logs 2 then returns 1
 * ])(1)
 */ "
spy = (logger,label, fn, x) ->
    apply logger, [label, x]
    fn x

exporting = def \sanfu/spy {} [$.AnyFunction, $.String, $.AnyFunction, $.Any, $.Any] spy 

export spy: exporting