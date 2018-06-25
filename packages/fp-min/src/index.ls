import sanctuary: {map, add, ap}

x = [1 to 5] |> map add |> ap <| [1 to 5]

console.log x

w = add >> map