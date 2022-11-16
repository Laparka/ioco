import * as ts from "typescript";
import { TraversalContext } from "../../containerBuilders/context";
export declare function visitAsync(statement: ts.Statement, context: TraversalContext): Promise<void>;
export declare function visitAddModuleAsync(callExpression: ts.CallExpression, context: TraversalContext): Promise<void>;
