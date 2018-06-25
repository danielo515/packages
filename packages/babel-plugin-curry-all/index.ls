# log = -> console.log(it)
tail = -> it.slice 1
head = -> it.slice 0 1
expandParams = (t, args, body, async) ->
    if args.length > 1 then
        t.arrowFunctionExpression (head args), expandParams t, (tail args), body, async
    else
        t.arrowFunctionExpression (head args), body, async

function transformFunction t, functionType, id, {params, body, generator, async}
    expandParams t, (tail params), body, async
    |> t.returnStatement 
    |> -> t.blockStatement [it]
    |> -> functionType id, (head params), it, generator, async

function pickId
    if it.parent.type == \AssignmentExpression 
    then it.parent.left
    else it.parent.id

# assignFunction = (t) -> (id, body) -> t.assignmentExpression '=', id, body

module.exports = ({types: t}) -> 
    visitor: 
        FunctionDeclaration: (path, state) ->
            node = path.node;
            {params, body, id} = node;
            if params.length > 1 then 
                path.replaceWith transformFunction t, t.functionDeclaration, id, node
        FunctionExpression: (path, state) ->
            {node, parentPath, parent} = path;
            {params, body} = node;
            id = pickId path
            # log id
            if !id then return
            if params.length > 1 then
                # wrapper = if parent.type == \AssignmentExpression
                #         then assignFunction t
                #         else t.variableDeclarator
                path.replaceWith transformFunction t, t.functionExpression, id, node