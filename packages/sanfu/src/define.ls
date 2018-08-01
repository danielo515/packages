
module.exports = ($) ->
    a: $.TypeVariable \a
    b: $.TypeVariable \b
    c: $.TypeVariable \c 
    Fn: (x,y) -> $.Function [x, y]