expandArgs = (t, parent, args) ->
    args.reduce ((prev, it) -> t.callExpression prev, [it]), parent


module.exports = ({types: t}) -> 
    isBuiltIn = -> t.isMemberExpression it and it.object.name in ['console','Math']
    
    visitor: CallExpression: 
        ({node}:path, state) ->
            args = node.arguments;
            if isBuiltIn node.callee then return
            if args.length > 1 then 
                path.replaceWith expandArgs t, node.callee, args

        