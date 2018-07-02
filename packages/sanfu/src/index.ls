import sanctuary: {unchecked}
import \sanctuary-def : $
{reduce} = unchecked
prod = /production/i .test process.env.NODE_ENV
def = $.create checkTypes:not prod, env: $.env

function push arr, x
    arr.push x
    arr

objAcc = (init, o) -> {...init, ...o}

function pipeAcc fns
    acc = push []
    reducer = (p, f) -> p.then f . acc
    (x) -> reduce reducer, (Promise.resolve x), fns

function tap f, x
    f x
    x


log = (label,x) ->
    console.log label
    console.log x

inspect = (label, fn, x) ->
    log label, x
    fn x

module.exports = 
    tap: def \sanfu/tap {} [$.AnyFunction, $.Any, $.Any] tap
    inspect: def \sanfu/inspect {} [$.String, $.AnyFunction, $.Any, $.Any] inspect
    pipeAcc: def \sanfu/promise/pipeAcc {} [($.Array $.AnyFunction), $.AnyFunction] pipeAcc
    push: def \sanfu/push {} [($.Array $.Any), $.Any] push
