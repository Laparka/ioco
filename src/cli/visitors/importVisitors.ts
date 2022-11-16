import * as ts from "typescript";
import path from "path";
import {AccessorType, ImportDefinition, ImportDefinitions, TraversalContext} from "../../containerBuilders/context";

export function visitImportDeclaration(statement: ts.ImportDeclaration, context: TraversalContext): void {
    const importSpecifier = <ts.StringLiteral>statement.moduleSpecifier;
    if (!importSpecifier || !importSpecifier.text) {
        return;
    }

    const isRelativePath = importSpecifier.text.startsWith('.');
    const typeLocationPath = isRelativePath
        ? path.join(context.registrationDirPath, importSpecifier.text)
        : importSpecifier.text;
    if (statement.importClause?.namedBindings) {
        if (statement.importClause.namedBindings.kind === ts.SyntaxKind.NamedImports) {
            const namedImports = <ts.NamedImports>statement.importClause.namedBindings;
            for (let i = 0; i < namedImports.elements.length; i++) {
                const element = namedImports.elements[i];
                let actualType, aliasType;
                if (element.propertyName) {
                    actualType = element.propertyName?.text
                    aliasType = element.name.text;
                }
                else {
                    actualType = aliasType = element.name.text;
                }

                context.imports.names.set(aliasType, {
                    locationPath: typeLocationPath,
                    aliasTypeName: aliasType,
                    typeName: actualType,
                    importType: "Named",
                    isExternal: !isRelativePath
                });
                context.imports.aliasesPath.push(`${typeLocationPath}:${aliasType}`);
            }
        }
        else if (statement.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
            const namespaceImport = <ts.NamespaceImport>statement.importClause.namedBindings;
            context.imports.names.set(namespaceImport.name.text, {
                locationPath: typeLocationPath,
                aliasTypeName: namespaceImport.name.text,
                typeName: '*',
                importType: "Namespace",
                isExternal: !isRelativePath
            });
            context.imports.aliasesPath.push(`${typeLocationPath}:${namespaceImport.name.text}`);
        }
        else {
            throw Error('Not supported yet');
        }
    }
    else {
        const importType = statement.importClause!.name!.text;
        context.imports.names.set(importType, {
            locationPath: typeLocationPath,
            importType: "Default",
            typeName: importType,
            aliasTypeName: importType,
            isExternal: !isRelativePath
        });

        context.imports.aliasesPath.push(`${typeLocationPath}:${importType}`);
    }
}

function getImportDefinition(accessor: string, currentContextPath: string, imports: ImportDefinitions): ImportDefinition {
    const accessorSegments = accessor.split(/[.]/g);
    let importDefinition = imports.names.get(accessorSegments[0]);
    if (!importDefinition) {
        importDefinition = {
            typeName: accessor,
            aliasTypeName: accessor,
            importType: "Local",
            locationPath: currentContextPath,
            isExternal: false
        };
    }

    return importDefinition;
}

export function getAccessorType(accessor: string, context: TraversalContext): AccessorType {
    const importedFrom = getImportDefinition(accessor, context.registrationFilePath, context.imports);
    if (importedFrom.importType === "Namespace") {
        const accessorSegments = accessor.split(/[.]/g);
        return {
            isExternal: importedFrom.isExternal,
            typeName: accessorSegments[accessorSegments.length - 1],
            locationPath: importedFrom.locationPath,
            importType: importedFrom.importType
        }
    }

    return {
        locationPath: importedFrom.locationPath,
        isExternal: importedFrom.isExternal,
        typeName: importedFrom.typeName,
        importType: importedFrom.importType
    }
}