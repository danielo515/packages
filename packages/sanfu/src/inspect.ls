import \./define : definitors
import \sanctuary-def : $
import \./apply : {apply}

{ def } = definitors $

inspect = (logger,label, fn, x) ->
    apply logger, [label, x]
    fn x

exporting = def \sanfu/inspect {} [$.AnyFunction, $.String, $.AnyFunction, $.Any, $.Any] inspect 

export inspect: exporting