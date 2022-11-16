import * as ts from "typescript";

export function evaluateTypeAccessor(expression: ts.Node, pathSegments?: string[]): string {
    if (!pathSegments) {
        pathSegments = [];
    }

    switch (expression.kind) {
        case ts.SyntaxKind.TypeReference: {
            const typeName = evaluateAccessor((<ts.TypeReferenceNode>expression).typeName);
            pathSegments.push(typeName);
            break;
        }
    }

    if (pathSegments.length === 0) {
        throw Error(`Not supported type accessor kind: ${expression.kind}`);
    }

    return pathSegments.join('.');
}

export function evaluateAccessor(expression: ts.Node, pathSegments?: string[]): string {
    if (!pathSegments) {
        pathSegments = [];
    }

    switch (expression.kind) {
        case ts.SyntaxKind.Identifier: {
            const idExp = <ts.Identifier>expression;
            pathSegments.push(idExp.text);
            break;
        }

        case ts.SyntaxKind.QualifiedName: {
            const qualifiedNameExp = <ts.QualifiedName>expression;
            evaluateAccessor(qualifiedNameExp.left, pathSegments);
            evaluateAccessor(qualifiedNameExp.right, pathSegments);
            break;
        }

        case ts.SyntaxKind.PropertyAccessExpression: {
            const propAccessExp = <ts.PropertyAccessExpression>expression;
            evaluateAccessor(propAccessExp.expression, pathSegments);
            evaluateAccessor(propAccessExp.name, pathSegments);
            break;
        }

        case ts.SyntaxKind.CallExpression: {
            const callExp = <ts.CallExpression>expression;
            evaluateAccessor(callExp.expression, pathSegments);
            break;
        }

        case ts.SyntaxKind.StringLiteral: {
            pathSegments.push((<ts.StringLiteral>expression).text);
            break;
        }

        default: {
            throw Error('Invalid syntax kind within the literal expression statement');
        }
    }

    if (pathSegments.length === 0) {
        throw Error(`No accessor evaluated`);
    }

    return pathSegments.join('.');
}

export function evaluateStringLiteral(expression: ts.Node): string {
    if (expression.kind !== ts.SyntaxKind.StringLiteral) {
        throw Error(`A string literal was expected`);
    }

    return evaluateAccessor(expression);
}

export function isRegisterMethod(statement: ts.Declaration): ts.MethodDeclaration | undefined {
    if (statement?.kind !== ts.SyntaxKind.MethodDeclaration) {
        return undefined;
    }

    const methodDeclaration = <ts.MethodDeclaration>statement;
    if (evaluateAccessor(methodDeclaration.name) !== "register") {
        return undefined;
    }

    if (methodDeclaration.type?.kind !== ts.SyntaxKind.VoidKeyword) {
        return undefined;
    }

    if (methodDeclaration.parameters.length !== 1){
        return undefined;
    }

    return methodDeclaration;
}