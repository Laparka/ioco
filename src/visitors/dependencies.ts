import {AccessorType, getAccessorType, ImportDefinition, visitImportDeclaration} from "./importVisitors";
import path from "path";
import fs from "fs";
import * as ts from "typescript";
import {TraversalContext} from "./context";
import {evaluateAccessor, evaluateTypeAccessor} from "./utils";

function visit(statement: ts.Statement, context: TraversalContext, dependencies: string[]): void {
    switch (statement.kind) {
        case ts.SyntaxKind.ImportDeclaration: {
            visitImportDeclaration(<ts.ImportDeclaration>statement, context);
            break;
        }

        case ts.SyntaxKind.ClassDeclaration: {
            const classDeclaration = <ts.ClassDeclaration>statement;
            visitClassDeclaration(classDeclaration, context, dependencies);
            break;
        }
    }
}

function visitClassDeclaration(classDeclaration: ts.ClassDeclaration, context: TraversalContext, dependencies: string[]): void {
    if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
        for(let i = 0; i < classDeclaration.members.length; i++) {
            const classMember = classDeclaration.members[i];
            if (classMember.kind === ts.SyntaxKind.Constructor) {
                const ctor = <ts.ConstructorDeclaration>classMember;
                for(let ctorIdx = 0; ctorIdx < ctor.parameters.length; ctorIdx++) {
                    visitCtorArg(ctor.parameters[ctorIdx], context, dependencies);
                }

                break;
            }
        }
    }
}

function visitCtorArg(parameter: ts.ParameterDeclaration, context: TraversalContext, dependencies: string[]): void {
    if (!parameter.type) {
        throw Error(`A type of the parameter is required within the constructor to recognize a resolving type`);
    }

    const parameterTypeName = evaluateTypeAccessor(parameter.type);
    const type = getAccessorType(parameterTypeName, context);
    dependencies.push(`${type.locationPath}:${type.typeName}`);
}

export async function listDependenciesAsync(instance: AccessorType): Promise<string[]> {
    if (instance.isExternal) {
        return [];
    }

    const filePath = `${instance.locationPath}.ts`;
    const code = await fs.promises.readFile(filePath, 'utf-8');
    const context: TraversalContext = {
        imports: {
            names: new Map<string, ImportDefinition>(),
            aliasesPath: []
        },
        registrationFilePath: instance.locationPath,
        registrationDirPath: path.dirname(filePath),
        startupName: instance.typeName,
        registrations: {
            instances: [],
            resolvers: []
        }
    };
    const dependencies: string[] = [];
    const sourceFile = ts.createSourceFile("_.ts", code, ts.ScriptTarget.Latest);
    for(let i = 0; i < sourceFile.statements.length; i++) {
        visit(sourceFile.statements[i], context, dependencies);
    }

    return dependencies;
}