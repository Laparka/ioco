import * as ts from 'typescript';
import * as fs from 'fs';
import path from "path";
import {Registrations, TraversalContext} from "./context";
import {ImportDefinition, visitImportDeclaration} from "./importVisitors";
import {
    evaluateAccessor,
    isRegisterMethod
} from "./utils";
import {visitAddResolverAsync} from "./addResolverVisitor";
import {visitAddServiceMethod} from "./addServiceVisitor";
import {visitAddModuleAsync} from "./addModuleVisitor";
import {listDependenciesAsync} from "./dependencies";

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

async function visitSourceFileAsync(sourceFile: ts.SourceFile, context: TraversalContext): Promise<void> {
    if (sourceFile?.statements) {
        for (let i = 0; i < sourceFile.statements.length; i++) {
            await visitAsync(sourceFile.statements[i], context);
        }
    }
}

/*
{
    "entryModulePath": "./__tests__/startup.
}
* */
export async function listRegistrations(importPath: string, startupName: string): Promise<Registrations> {
    if (!importPath || !startupName) {
        throw Error(`A relative path to your startup and an exportable startup name are required`);
    }

    const fileAbsolutePath = path.resolve(importPath.endsWith('.ts') ? importPath : `${importPath}.ts`);
    const code = await fs.promises.readFile(fileAbsolutePath, 'utf-8');
    const fileDirPath = path.dirname(fileAbsolutePath);
    const sourceFile = ts.createSourceFile("_.ts", code, ts.ScriptTarget.Latest);
    const context: TraversalContext = {
        imports: {
            names: new Map<string, ImportDefinition>(),
            aliasesPath: []
        },
        registrationFilePath: fileAbsolutePath.substring(0, fileAbsolutePath.length - path.extname(fileAbsolutePath).length),
        registrationDirPath: fileDirPath,
        registrations: {
            instances: [],
            resolvers: []
        },
        startupName: startupName
    };

    await visitSourceFileAsync(sourceFile, context);

    const processedInstances = new Map<string, string[]>();
    for(let i = 0; i < context.registrations.instances.length; i++) {
        const instance = context.registrations.instances[i];
        if (instance.instanceType.isExternal) {
            instance.dependencies = [];
            continue;
        }

        const instancePath = `${instance.instanceType.locationPath}:${instance.instanceType.typeName}`;
        let processed = processedInstances.get(instancePath);
        if (!processed) {
            processed = [];
            processedInstances.set(instancePath, processed);
            const dependencies = await listDependenciesAsync(instance.instanceType);
            processed.push(...dependencies);
        }

        instance.dependencies = processed;
    }

    return context.registrations;
}