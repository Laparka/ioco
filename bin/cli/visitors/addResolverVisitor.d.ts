import * as ts from "typescript";
import { TraversalContext } from "../../containerBuilders/context";
export declare function visitAddResolverAsync(callExpression: ts.CallExpression, parentContext: TraversalContext): Promise<void>;
export declare function isResolveMethod(statement: ts.Declaration): ts.MethodDeclaration | undefined;
