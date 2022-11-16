import * as ts from "typescript";
import {TraversalContext} from "./context";
import {evaluateAccessor, isRegisterMethod} from "./utils";
import {getAccessorType, ImportDefinition, visitImportDeclaration} from "./importVisitors";
import path from "path";
import fs from "fs";
import {visitAddServiceMethod} from "./addServiceVisitor";
import {visitAddResolverAsync} from "./addResolverVisitor";

async function visitRegisterMethodBodyAsync(methodBody: ts.Block, context: TraversalContext): Promise<void> {
    for (let i = 0; i < methodBody.statements.length; i++) {
        const statement = methodBody.statements[i];
        if (statement.kind !== ts.SyntaxKind.ExpressionStatement) {
            continue;
        }

        const expr = <ts.ExpressionStatement>statement;
        if (expr.expression.kind !== ts.SyntaxKind.CallExpression) {
            continue;
        }

        const callExp = <ts.CallExpression>expr.expression;
        if (callExp.arguments.length === 0) {
            continue;
        }

        const callMethod = evaluateAccessor(expr.expression);
        switch (callMethod) {
            case "builder.addModule": {
                if (callExp.arguments.length === 1) {
                    await visitAddModuleAsync(callExp, context);
                }

                break;
            }

            case "builder.addService": {
                visitAddServiceMethod(callExp, context);
                break;
            }

            case "builder.addResolver": {
                await visitAddResolverAsync(callExp, context);
                break;
            }
        }
    }
}

async function visitVariableDeclarationAsync(declaration: ts.VariableDeclaration, context: TraversalContext): Promise<void> {
    if (declaration.initializer && evaluateAccessor(declaration.name) === context.startupName) {
        switch (declaration.initializer.kind) {
            case ts.SyntaxKind.ObjectLiteralExpression: {
                const init = <ts.ObjectLiteralExpression>declaration.initializer;
                for(let i = 0; i < init.properties.length; i++) {
                    const property = init.properties[i];
                    const methodDeclaration = isRegisterMethod(property);
                    if (!methodDeclaration?.body) {
                        continue;
                    }

                    await visitRegisterMethodBodyAsync(methodDeclaration.body, context);
                    break;
                }

                break;
            }
        }
    }
}

async function visitClassDeclarationAsync(classDeclaration: ts.ClassDeclaration, context: TraversalContext): Promise<void> {
    if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
        return await visitRegistrationModuleClassAsync(classDeclaration, context);
    }
}

async function visitBlockAsync(statement: ts.Block, context: TraversalContext): Promise<void> {
    for(let i = 0; i < statement.statements.length; i++) {
        await visitAsync(statement.statements[i], context);
    }
}

async function visitRegistrationModuleClassAsync(classDeclaration: ts.ClassDeclaration, context: TraversalContext): Promise<void> {
    if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
        for (let i = 0; i < classDeclaration.members.length; i++) {
            const classElement = classDeclaration.members[i];
            const methodDeclaration = isRegisterMethod(classElement);
            if (!methodDeclaration?.body) {
                continue;
            }

            await visitRegisterMethodBodyAsync(methodDeclaration.body, context);
        }
    }
}

export async function visitAsync(statement: ts.Statement, context: TraversalContext): Promise<void> {
    switch (statement.kind) {
        case ts.SyntaxKind.Block:{
            await visitBlockAsync(<ts.Block>statement, context);
            break;
        }

        case ts.SyntaxKind.ImportDeclaration: {
            visitImportDeclaration(<ts.ImportDeclaration>statement, context);
            break;
        }

        case ts.SyntaxKind.ClassDeclaration: {
            await visitClassDeclarationAsync(<ts.ClassDeclaration>statement, context);
            break;
        }

        case ts.SyntaxKind.VariableStatement:{
            const variable = <ts.VariableStatement>statement;
            for(let dec = 0; dec < variable.declarationList.declarations.length; dec++) {
                const declaration = variable.declarationList.declarations[dec];
                await visitVariableDeclarationAsync(declaration, context);
            }

            break;
        }
    }
}


export async function visitAddModuleAsync(callExpression: ts.CallExpression, context: TraversalContext): Promise<void> {
    if (callExpression.arguments.length !== 1) {
        throw Error(`The module argument is missing`);
    }

    const moduleArg = callExpression.arguments[0];
    let instanceAccessor;
    switch (moduleArg.kind) {
        case ts.SyntaxKind.NewExpression: {
            // .addModule(new Startup());
            const newExp = <ts.NewExpression>moduleArg;
            instanceAccessor = evaluateAccessor(newExp.expression);
            break;
        }

        case ts.SyntaxKind.Identifier: {
            // .addModule(localStartup);
            instanceAccessor = evaluateAccessor(moduleArg);
            break;
        }

        default: {
            throw Error(`Not supported .addModule-argument usage`);
        }
    }

    const instanceType = getAccessorType(instanceAccessor, context);
    if (instanceType.isExternal) {
        throw Error(`Can't read the external libraries: ${instanceType.locationPath}`);
    }

    const moduleCtx: TraversalContext = {
        startupName: instanceType.typeName,
        registrationFilePath:  instanceType.locationPath,
        registrationDirPath: path.dirname(instanceType.locationPath),
        imports: {
            names: new Map<string, ImportDefinition>(),
            aliasesPath: []
        },
        registrations: context.registrations
    };

    const code = await fs.promises.readFile(`${instanceType.locationPath}.ts`, 'utf-8');
    const sourceFile = ts.createSourceFile("_.ts", code, ts.ScriptTarget.Latest);
    if (sourceFile?.statements) {
        for (let i = 0; i < sourceFile.statements.length; i++) {
            await visitAsync(sourceFile.statements[i], moduleCtx);
        }
    }
}