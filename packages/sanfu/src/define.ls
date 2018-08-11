prod = /production/i .test process.env.NODE_ENV

module.exports = ($) ->
    a: $.TypeVariable \a
    b: $.TypeVariable \b
    c: $.TypeVariable \c 
    Fn: (x,y) -> $.Function [x, y]
    def: $.create checkTypes:not prod, env: $.env