import \sanctuary-def : $
import \./define : definitors

{ Fn, a, b, c, def } = definitors $

function starling f, g, a
    f a, g a

S = def \sanfu/starling {} [ (Fn a, (Fn b, c)) , (Fn a, b) , a , c ] starling

module.exports = S