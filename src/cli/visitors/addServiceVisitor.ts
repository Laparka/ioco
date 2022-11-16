import * as ts from "typescript";
import {TraversalContext} from "../../containerBuilders/context";
import {getAccessorType} from "./importVisitors";
import {evaluateAccessor, evaluateTypeAccessor} from "./utils";

export function visitAddServiceMethod(statement: ts.CallExpression, context: TraversalContext): void {
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