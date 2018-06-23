log = -> console.log(it)
tail = -> it.slice 1
head = -> it.slice 0 1
expandParams = (t, args, body) ->
    if args.length > 1 then
        t.arrowFunctionExpression (head args), expandParams t, (tail args), body
    else
        t.arrowFunctionExpression (head args), body

function transformFunction t, functionType, id, params, body
    expandParams t, (tail params), body
    |> t.returnStatement 
    |> -> t.blockStatement [it]
    |> -> functionType id, (head params), it

function pickId
    if it.parent.type == \AssignmentExpression 
    then it.parent.left
    else it.parent.id

module.exports = ({types: t}) -> 
    visitor: 
        FunctionDeclaration: (path, state) ->
            node = path.node;
            {params, body, id} = node;
            if params.length > 1 then 
                path.replaceWith transformFunction t, t.functionDeclaration, id, params, body
        FunctionExpression: (path, state) ->
            {node, parentPath, parent} = path;
            {params, body} = node;
            id = pickId path
            if !id then return
            log parent
            if params.length > 1 then
                wrapper = if parent.type == \AssignmentExpression
                        then t.assignmentExpression
                        else t.variableDeclarator
                parentPath.replaceWith wrapper id, transformFunction t, t.functionExpression, id, params, body