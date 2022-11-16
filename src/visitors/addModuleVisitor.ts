import * as ts from "typescript";
import {TraversalContext} from "./context";
import {evaluateAccessor} from "./utils";
import {getAccessorType, ImportDefinition} from "./importVisitors";
import path from "path";
import fs from "fs";
import {visitAsync} from "./index";

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