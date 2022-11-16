import * as ts from "typescript";
export declare function evaluateTypeAccessor(expression: ts.Node, pathSegments?: string[]): string;
export declare function evaluateAccessor(expression: ts.Node, pathSegments?: string[]): string;
export declare function isRegisterMethod(statement: ts.Declaration): ts.MethodDeclaration | undefined;
