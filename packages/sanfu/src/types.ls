
makeTypes = (S,$) ->
    [ $.NullaryType 'Promise' \sanfu/promise (x) -> (S.type x).name is 'Promise' ]

export {makeTypes}