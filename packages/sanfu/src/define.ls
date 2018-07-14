

module.exports = ($) ->
    Fn = (x,y) -> $.Function [x, y]

    const a = $.TypeVariable 'a'
    const b = $.TypeVariable 'b'
    const c = $.TypeVariable 'c'
    {a, b, c, Fn}