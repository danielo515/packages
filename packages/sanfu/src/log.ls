import \./apply : {apply}

log = (label,x) ->
    apply console.log, [label, x]


export {log}