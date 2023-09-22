import * as ts from 'typescript';
import * as fs from 'fs';
import path from "path";

interface DependencyGraph {
    modulePath: string;
}

function _buildImportTree(filePath: string, importTree: DependencyGraph): DependencyGraph {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, fileContents, ts.ScriptTarget.ESNext, true);
    for(const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement)) {
            continue;
        }

        if (!statement.importClause || !ts.isImportClause(statement.importClause)) {
            continue;
        }

        if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }

        const moduleName = statement.moduleSpecifier.text;
        let modulePath: string;
        if (moduleName.startsWith('.')) {
            modulePath = path.join(path.dirname(filePath), `${moduleName}.ts`);
            if (!fs.existsSync(modulePath)) {
                modulePath = path.join(path.dirname(filePath), moduleName, 'index.ts');
            }
        }
        else {
            modulePath = moduleName;
        }

        if (statement.importClause.namedBindings) {
            if (ts.isNamespaceImport(statement.importClause.namedBindings)) {
                // import * as alias from './path'
                const a = statement.importClause.namedBindings.name.text;
            }
            else if (ts.isNamedImports(statement.importClause.namedBindings)) {
                statement.importClause.namedBindings.elements.forEach(importSpecifier => {
                    if (importSpecifier.propertyName && importSpecifier.name) {
                        // import {ServiceInterface as Interface} from './path';
                        const a = `${importSpecifier.propertyName.text} as ${importSpecifier.name.text}`;
                    } else if (importSpecifier.name) {
                        // import {ServiceInterface, ServiceImpl} from './path';
                        const a = importSpecifier.name.text;
                    }
                });
            }
        }
        else if (statement.importClause.name) {
            // import ServiceImpl from './path'
        }
    }
    return importTree;
}
export function buildImportTree(callerPath: string, relativePath: string): DependencyGraph {
    const filePath = path.join(callerPath, relativePath);
    return _buildImportTree(filePath, {modulePath: filePath});
}