'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ts = require('typescript');
var fs = require('fs');
var path = require('path');
var argParser = require('yargs-parser');
var process = require('process');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var ts__namespace = /*#__PURE__*/_interopNamespace(ts);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var argParser__default = /*#__PURE__*/_interopDefaultLegacy(argParser);
var process__default = /*#__PURE__*/_interopDefaultLegacy(process);

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function evaluateTypeAccessor(expression, pathSegments) {
    if (!pathSegments) {
        pathSegments = [];
    }
    switch (expression.kind) {
        case ts__namespace.SyntaxKind.TypeReference: {
            const typeName = evaluateAccessor(expression.typeName);
            pathSegments.push(typeName);
            break;
        }
    }
    if (pathSegments.length === 0) {
        throw Error(`Not supported type accessor kind: ${expression.kind}`);
    }
    return pathSegments.join('.');
}
function evaluateAccessor(expression, pathSegments) {
    if (!pathSegments) {
        pathSegments = [];
    }
    switch (expression.kind) {
        case ts__namespace.SyntaxKind.Identifier: {
            const idExp = expression;
            pathSegments.push(idExp.text);
            break;
        }
        case ts__namespace.SyntaxKind.QualifiedName: {
            const qualifiedNameExp = expression;
            evaluateAccessor(qualifiedNameExp.left, pathSegments);
            evaluateAccessor(qualifiedNameExp.right, pathSegments);
            break;
        }
        case ts__namespace.SyntaxKind.PropertyAccessExpression: {
            const propAccessExp = expression;
            evaluateAccessor(propAccessExp.expression, pathSegments);
            evaluateAccessor(propAccessExp.name, pathSegments);
            break;
        }
        case ts__namespace.SyntaxKind.CallExpression: {
            const callExp = expression;
            evaluateAccessor(callExp.expression, pathSegments);
            break;
        }
        case ts__namespace.SyntaxKind.StringLiteral: {
            pathSegments.push(expression.text);
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
function isRegisterMethod(statement) {
    var _a;
    if ((statement === null || statement === void 0 ? void 0 : statement.kind) !== ts__namespace.SyntaxKind.MethodDeclaration) {
        return undefined;
    }
    const methodDeclaration = statement;
    if (evaluateAccessor(methodDeclaration.name) !== "register") {
        return undefined;
    }
    if (((_a = methodDeclaration.type) === null || _a === void 0 ? void 0 : _a.kind) !== ts__namespace.SyntaxKind.VoidKeyword) {
        return undefined;
    }
    if (methodDeclaration.parameters.length !== 1) {
        return undefined;
    }
    return methodDeclaration;
}

function visitImportDeclaration(statement, context) {
    var _a, _b;
    const importSpecifier = statement.moduleSpecifier;
    if (!importSpecifier || !importSpecifier.text) {
        return;
    }
    const isRelativePath = importSpecifier.text.startsWith('.');
    const typeLocationPath = isRelativePath
        ? path__default["default"].join(context.registrationDirPath, importSpecifier.text)
        : importSpecifier.text;
    if ((_a = statement.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) {
        if (statement.importClause.namedBindings.kind === ts__namespace.SyntaxKind.NamedImports) {
            const namedImports = statement.importClause.namedBindings;
            for (let i = 0; i < namedImports.elements.length; i++) {
                const element = namedImports.elements[i];
                let actualType, aliasType;
                if (element.propertyName) {
                    actualType = (_b = element.propertyName) === null || _b === void 0 ? void 0 : _b.text;
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
        else if (statement.importClause.namedBindings.kind === ts__namespace.SyntaxKind.NamespaceImport) {
            const namespaceImport = statement.importClause.namedBindings;
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
        const importType = statement.importClause.name.text;
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
function getImportDefinition(accessor, currentContextPath, imports) {
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
function getAccessorType(accessor, context) {
    const importedFrom = getImportDefinition(accessor, context.registrationFilePath, context.imports);
    if (importedFrom.importType === "Namespace") {
        const accessorSegments = accessor.split(/[.]/g);
        return {
            isExternal: importedFrom.isExternal,
            typeName: accessorSegments[accessorSegments.length - 1],
            locationPath: importedFrom.locationPath,
            importType: importedFrom.importType
        };
    }
    return {
        locationPath: importedFrom.locationPath,
        isExternal: importedFrom.isExternal,
        typeName: importedFrom.typeName,
        importType: importedFrom.importType
    };
}

function visitAddServiceMethod(statement, context) {
    // addService<TService>(instance: InstanceCtor<TService>, serviceKey: string, scope: ServiceScope)
    if (!statement.typeArguments || statement.typeArguments.length !== 1) {
        throw Error(`The type argument is required for the addService-method call`);
    }
    const serviceTypeAccessor = evaluateTypeAccessor(statement.typeArguments[0]);
    const serviceType = getAccessorType(serviceTypeAccessor, context);
    if (statement.arguments.length !== 3) {
        throw Error(`The instance constructor, registration key and the scope type is missing`);
    }
    const instanceType = getAccessorType(evaluateAccessor(statement.arguments[0]), context);
    context.registrations.instances.push({
        serviceType: serviceType,
        instanceType: instanceType,
        dependencies: []
    });
}

function visitAddResolverAsync(callExpression, parentContext) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (callExpression.arguments.length !== 2) {
            throw Error(`The .addResolver-method requires two arguments: the resolver initializer and the service key`);
        }
        let resolverName;
        switch (callExpression.arguments[0].kind) {
            case ts__namespace.SyntaxKind.NewExpression: {
                const newExp = callExpression.arguments[0];
                resolverName = evaluateAccessor(newExp.expression);
                break;
            }
            case ts__namespace.SyntaxKind.Identifier: {
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
        const resolverContext = {
            imports: {
                names: new Map(),
                aliasesPath: []
            },
            registrationFilePath: resolverType.locationPath,
            registrationDirPath: path__default["default"].dirname(resolverType.locationPath),
            startupName: resolverType.typeName,
            registrations: parentContext.registrations
        };
        let serviceType;
        const resolverCode = yield fs__default["default"].promises.readFile(`${resolverType.locationPath}.ts`, 'utf-8');
        const sourceFile = ts__namespace.createSourceFile("_.ts", resolverCode, ts__namespace.ScriptTarget.Latest);
        for (let i = 0; i < sourceFile.statements.length && !serviceType; i++) {
            const statement = sourceFile.statements[i];
            switch (statement.kind) {
                case ts__namespace.SyntaxKind.ImportDeclaration: {
                    visitImportDeclaration(statement, resolverContext);
                    break;
                }
                case ts__namespace.SyntaxKind.VariableStatement: {
                    // const resolver = {
                    //  resolve(): Service {
                    //      return new Instance();
                    //  }
                    // };
                    const variableStatement = statement;
                    for (let varIndex = 0; varIndex < variableStatement.declarationList.declarations.length; varIndex++) {
                        const variable = variableStatement.declarationList.declarations[varIndex];
                        if (evaluateAccessor(variable.name) !== resolverContext.startupName) {
                            continue;
                        }
                        if (((_a = variable.initializer) === null || _a === void 0 ? void 0 : _a.kind) !== ts__namespace.SyntaxKind.ObjectLiteralExpression) {
                            continue;
                        }
                        const initializer = variable.initializer;
                        for (let propertyIndex = 0; propertyIndex < initializer.properties.length; propertyIndex++) {
                            const property = initializer.properties[propertyIndex];
                            const resolveMethod = isResolveMethod(property);
                            if (!resolveMethod) {
                                continue;
                            }
                            const serviceTypeAccessor = evaluateTypeAccessor(resolveMethod.type);
                            serviceType = getAccessorType(serviceTypeAccessor, resolverContext);
                            break;
                        }
                    }
                    break;
                }
                case ts__namespace.SyntaxKind.ClassDeclaration: {
                    // class Resolver implements ServiceResolver<Service> {
                    //  resolve(): Service {
                    //      return new Instance();
                    //  }
                    // }
                    const classDeclaration = statement;
                    if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === resolverContext.startupName) {
                        for (let memberIndex = 0; memberIndex < classDeclaration.members.length; memberIndex++) {
                            const classMember = classDeclaration.members[memberIndex];
                            const resolveMethod = isResolveMethod(classMember);
                            if (!resolveMethod) {
                                continue;
                            }
                            const serviceTypeAccessor = evaluateTypeAccessor(resolveMethod.type);
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
    });
}
function isResolveMethod(statement) {
    if ((statement === null || statement === void 0 ? void 0 : statement.kind) !== ts__namespace.SyntaxKind.MethodDeclaration) {
        return undefined;
    }
    const methodDeclaration = statement;
    if (methodDeclaration.parameters.length !== 0 || !methodDeclaration.type) {
        return undefined;
    }
    if (evaluateAccessor(methodDeclaration.name) !== "resolve") {
        return undefined;
    }
    return methodDeclaration;
}

function visitRegisterMethodBodyAsync(methodBody, context) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < methodBody.statements.length; i++) {
            const statement = methodBody.statements[i];
            if (statement.kind !== ts__namespace.SyntaxKind.ExpressionStatement) {
                continue;
            }
            const expr = statement;
            if (expr.expression.kind !== ts__namespace.SyntaxKind.CallExpression) {
                continue;
            }
            const callExp = expr.expression;
            if (callExp.arguments.length === 0) {
                continue;
            }
            const callMethod = evaluateAccessor(expr.expression);
            switch (callMethod) {
                case "builder.addModule": {
                    if (callExp.arguments.length === 1) {
                        yield visitAddModuleAsync(callExp, context);
                    }
                    break;
                }
                case "builder.addService": {
                    visitAddServiceMethod(callExp, context);
                    break;
                }
                case "builder.addResolver": {
                    yield visitAddResolverAsync(callExp, context);
                    break;
                }
            }
        }
    });
}
function visitVariableDeclarationAsync(declaration, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (declaration.initializer && evaluateAccessor(declaration.name) === context.startupName) {
            switch (declaration.initializer.kind) {
                case ts__namespace.SyntaxKind.ObjectLiteralExpression: {
                    const init = declaration.initializer;
                    for (let i = 0; i < init.properties.length; i++) {
                        const property = init.properties[i];
                        const methodDeclaration = isRegisterMethod(property);
                        if (!(methodDeclaration === null || methodDeclaration === void 0 ? void 0 : methodDeclaration.body)) {
                            continue;
                        }
                        yield visitRegisterMethodBodyAsync(methodDeclaration.body, context);
                        break;
                    }
                    break;
                }
            }
        }
    });
}
function visitClassDeclarationAsync(classDeclaration, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
            return yield visitRegistrationModuleClassAsync(classDeclaration, context);
        }
    });
}
function visitBlockAsync(statement, context) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < statement.statements.length; i++) {
            yield visitAsync(statement.statements[i], context);
        }
    });
}
function visitRegistrationModuleClassAsync(classDeclaration, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
            for (let i = 0; i < classDeclaration.members.length; i++) {
                const classElement = classDeclaration.members[i];
                const methodDeclaration = isRegisterMethod(classElement);
                if (!(methodDeclaration === null || methodDeclaration === void 0 ? void 0 : methodDeclaration.body)) {
                    continue;
                }
                yield visitRegisterMethodBodyAsync(methodDeclaration.body, context);
            }
        }
    });
}
function visitAsync(statement, context) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (statement.kind) {
            case ts__namespace.SyntaxKind.Block: {
                yield visitBlockAsync(statement, context);
                break;
            }
            case ts__namespace.SyntaxKind.ImportDeclaration: {
                visitImportDeclaration(statement, context);
                break;
            }
            case ts__namespace.SyntaxKind.ClassDeclaration: {
                yield visitClassDeclarationAsync(statement, context);
                break;
            }
            case ts__namespace.SyntaxKind.VariableStatement: {
                const variable = statement;
                for (let dec = 0; dec < variable.declarationList.declarations.length; dec++) {
                    const declaration = variable.declarationList.declarations[dec];
                    yield visitVariableDeclarationAsync(declaration, context);
                }
                break;
            }
        }
    });
}
function visitAddModuleAsync(callExpression, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (callExpression.arguments.length !== 1) {
            throw Error(`The module argument is missing`);
        }
        const moduleArg = callExpression.arguments[0];
        let instanceAccessor;
        switch (moduleArg.kind) {
            case ts__namespace.SyntaxKind.NewExpression: {
                // .addModule(new Startup());
                const newExp = moduleArg;
                instanceAccessor = evaluateAccessor(newExp.expression);
                break;
            }
            case ts__namespace.SyntaxKind.Identifier: {
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
        const moduleCtx = {
            startupName: instanceType.typeName,
            registrationFilePath: instanceType.locationPath,
            registrationDirPath: path__default["default"].dirname(instanceType.locationPath),
            imports: {
                names: new Map(),
                aliasesPath: []
            },
            registrations: context.registrations
        };
        const code = yield fs__default["default"].promises.readFile(`${instanceType.locationPath}.ts`, 'utf-8');
        const sourceFile = ts__namespace.createSourceFile("_.ts", code, ts__namespace.ScriptTarget.Latest);
        if (sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.statements) {
            for (let i = 0; i < sourceFile.statements.length; i++) {
                yield visitAsync(sourceFile.statements[i], moduleCtx);
            }
        }
    });
}

function visit(statement, context, dependencies) {
    switch (statement.kind) {
        case ts__namespace.SyntaxKind.ImportDeclaration: {
            visitImportDeclaration(statement, context);
            break;
        }
        case ts__namespace.SyntaxKind.ClassDeclaration: {
            const classDeclaration = statement;
            visitClassDeclaration(classDeclaration, context, dependencies);
            break;
        }
    }
}
function visitClassDeclaration(classDeclaration, context, dependencies) {
    if (classDeclaration.name && evaluateAccessor(classDeclaration.name) === context.startupName) {
        for (let i = 0; i < classDeclaration.members.length; i++) {
            const classMember = classDeclaration.members[i];
            if (classMember.kind === ts__namespace.SyntaxKind.Constructor) {
                const ctor = classMember;
                for (let ctorIdx = 0; ctorIdx < ctor.parameters.length; ctorIdx++) {
                    visitCtorArg(ctor.parameters[ctorIdx], context, dependencies);
                }
                break;
            }
        }
    }
}
function visitCtorArg(parameter, context, dependencies) {
    if (!parameter.type) {
        throw Error(`A type of the parameter is required within the constructor to recognize a resolving type`);
    }
    const parameterTypeName = evaluateTypeAccessor(parameter.type);
    const type = getAccessorType(parameterTypeName, context);
    dependencies.push(`${type.locationPath}:${type.typeName}`);
}
function listDependenciesAsync(instance) {
    return __awaiter(this, void 0, void 0, function* () {
        if (instance.isExternal) {
            return [];
        }
        const filePath = `${instance.locationPath}.ts`;
        const code = yield fs__default["default"].promises.readFile(filePath, 'utf-8');
        const context = {
            imports: {
                names: new Map(),
                aliasesPath: []
            },
            registrationFilePath: instance.locationPath,
            registrationDirPath: path__default["default"].dirname(filePath),
            startupName: instance.typeName,
            registrations: {
                instances: [],
                resolvers: []
            }
        };
        const dependencies = [];
        const sourceFile = ts__namespace.createSourceFile("_.ts", code, ts__namespace.ScriptTarget.Latest);
        for (let i = 0; i < sourceFile.statements.length; i++) {
            visit(sourceFile.statements[i], context, dependencies);
        }
        return dependencies;
    });
}

function visitSourceFileAsync(sourceFile, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.statements) {
            for (let i = 0; i < sourceFile.statements.length; i++) {
                yield visitAsync(sourceFile.statements[i], context);
            }
        }
    });
}
/*
{
    "entryModulePath": "./__tests__/startup.
}
* */
function listRegistrations(importPath, startupName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!importPath || !startupName) {
            throw Error(`A relative path to your startup and an exportable startup name are required`);
        }
        const fileAbsolutePath = path__default["default"].resolve(importPath.endsWith('.ts') ? importPath : `${importPath}.ts`);
        const code = yield fs__namespace.promises.readFile(fileAbsolutePath, 'utf-8');
        const fileDirPath = path__default["default"].dirname(fileAbsolutePath);
        const sourceFile = ts__namespace.createSourceFile("_.ts", code, ts__namespace.ScriptTarget.Latest);
        const context = {
            imports: {
                names: new Map(),
                aliasesPath: []
            },
            registrationFilePath: fileAbsolutePath.substring(0, fileAbsolutePath.length - path__default["default"].extname(fileAbsolutePath).length),
            registrationDirPath: fileDirPath,
            registrations: {
                instances: [],
                resolvers: []
            },
            startupName: startupName
        };
        yield visitSourceFileAsync(sourceFile, context);
        const processedInstances = new Map();
        for (let i = 0; i < context.registrations.instances.length; i++) {
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
                const dependencies = yield listDependenciesAsync(instance.instanceType);
                processed.push(...dependencies);
            }
            instance.dependencies = processed;
        }
        return context.registrations;
    });
}

function writeRegistrationsAsync(startupPath, startupModuleName, outputSchemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const schema = yield listRegistrations(startupPath, startupModuleName);
        yield fs__default["default"].promises.writeFile(outputSchemaFile, JSON.stringify(schema), { encoding: "utf8" });
    });
}
const command = argParser__default["default"](process__default["default"].argv.slice(2), {
    configuration: { "camel-case-expansion": false }
});
const configFile = command["c"];
if (!configFile) {
    throw Error(`The config file path is missing`);
}
if (!fs__default["default"].existsSync(configFile)) {
    throw Error(`The config file is missing at the given path ${configFile}`);
}
const config = JSON.parse(fs__default["default"].readFileSync(configFile, { encoding: "utf8" }));
const entryModule = config["entryModule"];
const outputSchemaFilePath = config["outputSchemaPath"];
if (!entryModule || !entryModule["path"] || !entryModule["instance"]) {
    throw Error(`The entryModule parameters [path, instance] are required`);
}
if (!outputSchemaFilePath) {
    throw Error(`The outputSchemaPath value is required`);
}
Promise.allSettled([writeRegistrationsAsync(entryModule["path"], entryModule["instance"], outputSchemaFilePath)])
    .catch(reason => console.error(reason));

exports.evaluateAccessor = evaluateAccessor;
exports.evaluateTypeAccessor = evaluateTypeAccessor;
exports.getAccessorType = getAccessorType;
exports.isRegisterMethod = isRegisterMethod;
exports.isResolveMethod = isResolveMethod;
exports.listDependenciesAsync = listDependenciesAsync;
exports.listRegistrations = listRegistrations;
exports.visitAddModuleAsync = visitAddModuleAsync;
exports.visitAddResolverAsync = visitAddResolverAsync;
exports.visitAddServiceMethod = visitAddServiceMethod;
exports.visitAsync = visitAsync;
exports.visitImportDeclaration = visitImportDeclaration;
