import \./define : definitors
import \sanctuary-def : $

{ def } = definitors $

function apply f, args
    f ...args


apply_ = def \sanfu/apply {} [$.AnyFunction, $.Function [($.Array $.Any), $.Any]] apply

export apply: apply_