'use strict';

const { createToken, Lexer, Parser } = require('chevrotain');

const {logDeep} = require('util');

const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_]\w+/ });
const Equal = createToken({ name: "Equal", pattern: /=/ })
const Or = createToken({ name: "Or", pattern: /\|/ })
const Integer = createToken({ name: "Integer", pattern: /[0-9_]+[a-z]*/ })
const Bool = createToken({ name: "Bool", pattern: /(yes|no|true|false)/ })
const Type = createToken({ name: "Type", pattern: /:: (Int|String|JSON|Boolean)/ })
const Str = createToken({ name: "Str", pattern: /\w+/ })

const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /\s+/,
    group: Lexer.SKIPPED,
    line_breaks: true
});

const allTokens = [
    Bool , Type
    , WhiteSpace, Identifier, Equal, Or, Integer, Str
]

let lexer = new Lexer(allTokens)

/**
 * This is how you would implement this on raw JS
 * ```js
 * const PORT = parseInt(process.env.PORT) || 3000;
 * const HOST = process.env.HOST || "satan.com";
 * module.exports = { PORT, HOST }
 * ```
 * 
 * 
 */
let inputText = "PORT = PORT | no   :: Int\n   " +
                // "HOST = HOST | satan.com :: String\n" +
                "";

// envStatement
// : constantDeclare envName (defaultValue)? typeDeclare
class EnvDsl extends Parser {
    /**
     * @param {IToken[]} input
     */
    constructor(input, options) {
        super(input, allTokens, options)

        const $ = this

        $.RULE("envStatement", () => {
            $.SUBRULE($.constantDeclare)
            $.SUBRULE($.envName)
            $.OPTION(() => {
                $.SUBRULE($.defaultValue)
            })
            $.SUBRULE($.typeDeclare)
        })

        $.RULE("constantDeclare", () => {
            $.CONSUME(Identifier)
            $.CONSUME(Equal)
        })

        $.RULE("envName", () => {
            $.CONSUME(Identifier)
            $.CONSUME(Or);
        })

        $.RULE("defaultValue", () => {
            $.MANY_SEP({
                SEP: Or,
                DEF: () => $.OR([
                    { ALT: () => $.CONSUME(Bool) },
                    { ALT: () => $.CONSUME(Integer) },
                    { ALT: () => $.CONSUME(Str) }
                ])
            })
        })

        $.RULE("typeDeclare", () => {
            $.CONSUME(Type)
        })

        Parser.performSelfAnalysis(this)
    }
}

const parser = new EnvDsl([], { outputCst: true })
const BaseVisitor = parser.getBaseCstVisitorConstructor();
const map = (fn,arr) => arr ? arr.map(fn) : [] ;
const get = prop => obj => obj[prop];
const toInt = str => str.replace(/_/g,'').replace(/[a-z]*$/,'') | 0
const toBool = str => (/yes|true/i).test(str)
const safe = fn => x => x && fn(x)


class ToAstVisitor extends BaseVisitor {
    constructor() {
        super()
        this.validateVisitor()
    }

    envStatement(ctx) {
        return {
            name: this.visit(ctx.constantDeclare),
            envName: this.visit(ctx.envName),
            default: this.visit(ctx.defaultValue),
            expectedType: this.visit(ctx.typeDeclare)
        }
    }

    constantDeclare({Identifier}) {
        return Identifier[0].image
    }

    envName({Identifier}) {
        return Identifier[0].image
    }

    defaultValue({Integer, Bool, Str}) {
        return map(
            x => Integer ? toInt(x) : Bool ? toBool(x) : x
            , map(get('image'), Integer || Bool )
        )
    }

    typeDeclare({Type}) {
        return Type[0].image.split(' ')[1]
    }

}

// Our visitor has no state, so a single instance is sufficient.
const toAstVisitor = new ToAstVisitor()

function parseInput(text) {
    const lexResult = lexer.tokenize(text)
    logDeep(lexResult)
    // "input" is a setter which will reset the parser's state.
    parser.input = lexResult.tokens
    const cst = parser.envStatement()

    if (parser.errors.length > 0) {
        throw Error(
            "Sad sad panda, parsing errors detected!\n" +
            parser.errors[0].message
        )
    }

    logDeep(cst);
    const ast = toAstVisitor.visit(cst)
    
    logDeep(ast);
    return ast
}

parseInput(inputText)