import * as ts from 'typescript';
import * as fs from 'fs';
import path from "path";
import {Registrations, TraversalContext} from "./context";
import {ImportDefinition} from "./importVisitors";
import {visitAsync} from "./addModuleVisitor";
import {listDependenciesAsync} from "./dependencies";

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