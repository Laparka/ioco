import * as ts from "typescript";
import {TraversalContext} from "./context";
import {
    AccessorType,
    getAccessorType,
    ImportDefinition,
    visitImportDeclaration
} from "./importVisitors";
import path from "path";
import fs from "fs";
import {evaluateAccessor, evaluateTypeAccessor} from "./utils";

export async function visitAddResolverAsync(callExpression: ts.CallExpression, parentContext: TraversalContext): Promise<void> {
    if (callExpression.arguments.length !== 2) {
        throw Error(`The .addResolver-method requires two arguments: the resolver initializer and the service key`);
    }

    let resolverName: string;
    switch (callExpression.arguments[0].kind) {
        case ts.SyntaxKind.NewExpression: {
            const newExp = <ts.NewExpression>callExpression.arguments[0];
            resolverName = evaluateAccessor(newExp.expression);
            break;
        }

        case ts.SyntaxKind.Identifier:{
            resolverName = evaluateAccessor(callExpression.arguments[0]);
            break;
        }

        default: {
            throw Error(`Not supported .addResolver-argument: ${callExpression.arguments[0]}`);
        }
    }

    const resolverType = getAccessorType(resolverName, parentContext);
    if (resolverType.isExternal) {
        throw Error(`Can't read the external resolver: ${resolverType.locationPath}:${resolverType.typeName}`);
    }

    const resolverContext: TraversalContext = {
        imports: {
            names: new Map<string, ImportDefinition>(),
            aliasesPath: []
        },
        registrationFilePath: resolverType.locationPath,
        registrationDirPath: path.dirname(resolverType.locationPath),
        startupName: resolverType.typeName,
        registrations: parentContext.registrations
    };

    let serviceType: AccessorType | undefined;
    const resolverCode = await fs.promises.readFile(`${resolverType.locationPath}.ts`, 'utf-8');
    const sourceFile = ts.createSourceFile("_.ts", resolverCode, ts.ScriptTarget.Latest);
    for(let i = 0; i < sourceFile.statements.length && !serviceType; i++) {
        const statement = sourceFile.statements[i];
        switch (statement.kind) {
            case ts.SyntaxKind.ImportDeclaration: {
                visitImportDeclaration(<ts.ImportDeclaration>statement, resolverContext);
                break;
            }
            case ts.SyntaxKind.VariableStatement: {
                // const resolver = {
                //  resolve(): Service {
                //      return new Instance();
                //  }
                // };
                const variableStatement = <ts.VariableStatement>statement;
                for(let varIndex = 0; varIndex < variableStatement.declarationList.declarations.length; varIndex++) {
                    const variable = variableStatement.declarationList.declarations[varIndex];
                    if (evaluateAccessor(variable.name) !== resolverContext.startupName) {
                        continue;
                    }

                    if (variable.initializer?.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
                        continue;
                    }

                    const initializer = <ts.ObjectLiteralExpression>variable.initializer;
                    for(let propertyIndex = 0; propertyIndex < initializer.properties.length; propertyIndex++) {
                        const property = initializer.properties[propertyIndex];
                        const resolveMethod = isResolveMethod(property);
                        if (!resolveMethod) {
                            continue;
                        }

                        const serviceTypeAccessor = evaluateTypeAccessor(resolveMethod.type!);
                        serviceType = getAccessorType(serviceTypeAccessor, resolverContext);
                        break;
                    }
                }

                break;
            }

            case ts.SyntaxKind.ClassDeclaration: {
                // class Resolver implements ServiceResolver<Service> {
                //  resolve(): Service {
                //      return new Instance();
                //  }
                // }
                const classDeclaration = <ts.ClassDeclaration>statement;
                if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === resolverContext.startupName) {
                    for(let memberIndex = 0; memberIndex < classDeclaration.members.length; memberIndex++) {
                        const classMember = classDeclaration.members[memberIndex];
                        const resolveMethod = isResolveMethod(classMember);
                        if (!resolveMethod) {
                            continue;
                        }

                        const serviceTypeAccessor = evaluateTypeAccessor(resolveMethod.type!);
                        serviceType = getAccessorType(serviceTypeAccessor, resolverContext);
                        break;
                    }
                }

                break;
            }
        }
    }

    if (serviceType) {
        parentContext.registrations.resolvers.push(serviceType);
    }
}

export function isResolveMethod(statement: ts.Declaration): ts.MethodDeclaration | undefined {
    if (statement?.kind !== ts.SyntaxKind.MethodDeclaration) {
        return undefined;
    }

    const methodDeclaration = <ts.MethodDeclaration>statement;
    if (methodDeclaration.parameters.length !== 0 || !methodDeclaration.type) {
        return undefined;
    }

    if (evaluateAccessor(methodDeclaration.name) !== "resolve") {
        return undefined;
    }

    return methodDeclaration;
}