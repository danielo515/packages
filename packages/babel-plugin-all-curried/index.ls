expandArgs = (t, parent, args) ->
    args.reduce ((prev, it) -> t.callExpression prev, [it]), parent

module.exports = ({types: t}) -> visitor: 
    CallExpression: (path, state) ->
        node = path.node;
        args = node.arguments;
        if args.length > 1 then 
            path.replaceWith expandArgs t, node.callee, args

        