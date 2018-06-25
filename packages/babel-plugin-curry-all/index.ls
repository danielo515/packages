# log = -> console.log(it)
tail = -> it.slice 1
expandParams = (t, args, body, async) ->
    if args.length > 1 then
        t.arrowFunctionExpression [args.0], expandParams t, (tail args), body, async
    else
        t.arrowFunctionExpression [args.0], body, async

function transformFunction t, functionType, id, {node: {params, body, generator, async}}: path
    if params.length <= 1 then return
    path.replaceWith 
    <| expandParams t, (tail params), body, async
    |> t.returnStatement 
    |> Array.of
    |> t.blockStatement
    |> functionType id, [params.0], _, generator, async

function pickId
    if it.parent.type == \AssignmentExpression 
    then it.parent.left
    else it.parent.id

module.exports = ({types: t}) -> 
    visitor: 
        FunctionDeclaration: (path, state) ->
            {node:{id}} = path;
            transformFunction t, t.functionDeclaration, id, path
        FunctionExpression: (path, state) ->
            id = pickId path
            if !id then return
            transformFunction t, t.functionExpression, id, path