import * as ts from "typescript";
import { AccessorType, TraversalContext } from "../../containerBuilders/context";
export declare function visitImportDeclaration(statement: ts.ImportDeclaration, context: TraversalContext): void;
export declare function getAccessorType(accessor: string, context: TraversalContext): AccessorType;
