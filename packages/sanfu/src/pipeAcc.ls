import \./define : definitors
import \sanctuary-def : $
import sanctuary: {unchecked}

{reduce} = unchecked
{ def } = definitors $

function push_ arr, x
    arr.push x
    arr


function pipeAcc fns
    acc = push_ []
    reducer = (p, f) -> p.then f . acc
    (x) -> reduce reducer, (Promise.resolve x), fns

exporting = def \sanfu/promise/pipeAcc {} [($.Array $.AnyFunction), $.AnyFunction] pipeAcc

export pipeAcc: exporting