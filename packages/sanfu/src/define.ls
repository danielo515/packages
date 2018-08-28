prod = /production/i .test process.env.NODE_ENV
import \./types : {makeTypes}
import sanctuary

module.exports = ($) ->
    types = makeTypes sanctuary, $

    a: $.TypeVariable \a
    b: $.TypeVariable \b
    c: $.TypeVariable \c 
    Fn: (x,y) -> $.Function [x, y]
    def: $.create checkTypes:not prod, env: $.env.concat types