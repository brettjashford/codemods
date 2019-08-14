const IDX_IDENTIFIER = 'o'; // the "o" in idx(seller, o => o.a.b.c)
const IDX_IMPORT = 'idx'; // local variable name for idx import
const IDX_PACKAGE = 'idx';

// find cjs imports (require(...)) and return helpers to modify them
function processCjs(j, ast) {
    const lodashGetRequires = ast.find(j.CallExpression, {
        callee: {
            name: 'require',
        },
        arguments: [{ value: 'lodash.get' }],
    });
    const importsFound = lodashGetRequires.length;
    if (!importsFound) {
        return { importsFound };
    }
    const identifierNode = lodashGetRequires
        .closest(j.VariableDeclarator)
        .find(j.Identifier)
        .nodes()[0];
    return {
        localVarName: identifierNode.name,
        setLocalVarName: name => (identifierNode.name = name),
        setImportedPackageName: name => (lodashGetRequires.nodes()[0].arguments[0].value = name),
        importsFound,
    };
}

// find es6 imports (import ... from ...) and return helpers to modify them
function processEs6(j, ast) {
    const lodashGetImports = ast.find(j.ImportDeclaration, {
        source: {
            value: 'lodash.get',
        },
    });
    const importsFound = lodashGetImports.length;
    if (!importsFound) {
        return { importsFound };
    }
    const importNode = lodashGetImports.nodes()[0];
    const localSpecifier = importNode.specifiers[0].local;
    return {
        localVarName: localSpecifier.name,
        setLocalVarName: name => (importNode.source.value = name),
        setImportedPackageName: name => (localSpecifier.name = name),
        importsFound,
    };
}

// turns second argument from lodash.get format of period delimited string to nested object ast ex. from 'a.b.c' to ast representing nested object o.a.b.c
function strToObjectChain(j, pathStr) {
    if (!(typeof pathStr === 'string')) {
        throw new Error('second argument to lodash.get must be a string');
    }
    const parts = pathStr.split('.');
    const numParts = parts.length;

    let initial;
    const firstPart = parts[0];
    if (firstPart.substring(0, 1) === '[') {
        // need special case so that get(obj, '[0].a') -> idx(obj, -> o[0].a)
        const arrIndex = parseInt(firstPart.substring(1, firstPart.indexOf(']')), 10);
        if (Number.isNaN(arrIndex)) {
            throw new Error(`cannot parse: ${firstPart}`);
        }
        initial = j.memberExpression(
            j.identifier(IDX_IDENTIFIER),
            j.numericLiteral(parseInt(arrIndex, 10)),
            true
        );
    } else {
        initial = j.memberExpression(j.identifier(IDX_IDENTIFIER), j.identifier(firstPart));
    }
    if (numParts === 1) {
        return initial;
    }
    return parts.slice(1).reduce(function(acc, current) {
        return j.memberExpression(acc, j.identifier(current), false);
    }, initial);
}

export default function transformer(fileInfo, api) {
    const j = api.jscodeshift;
    const ast = j(fileInfo.source);

    // search for cjs module requires
    let { localVarName, setLocalVarName, setImportedPackageName, importsFound } = processCjs(
        j,
        ast
    );
    // search for es6 module imports
    if (!importsFound) {
        ({ localVarName, setLocalVarName, setImportedPackageName, importsFound } = processEs6(
            j,
            ast
        ));
    }

    if (!importsFound) {
        return; // nothing found, skip this file
    }

    setLocalVarName(IDX_IMPORT); // rename local variable for idx import
    setImportedPackageName(IDX_PACKAGE); // rename imported package to idx

    // find occurrences of old local variable name (ex. get)
    const calls = ast.find(j.CallExpression, {
        callee: {
            name: localVarName,
        },
    });

    calls.forEach(call => {
        const callNode = call.value;
        const pathStr = callNode.arguments[1].value; // 'a.b.c' in get(obj, 'a.b.c')
        callNode.callee.name = IDX_IMPORT; // use variable name from idx import

        callNode.arguments[1] = j.arrowFunctionExpression(
            // modify arguments from 'a.b.c' to o => o.a.b.c
            [j.identifier(IDX_IDENTIFIER)],
            strToObjectChain(j, pathStr)
        );
    });

    return ast.toSource();
}
