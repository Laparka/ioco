import * as ts from "typescript";
import {TraversalContext} from "./context";
import {getAccessorType} from "./importVisitors";
import {evaluateAccessor, evaluateStringLiteral, evaluateTypeAccessor} from "./utils";
import {ServiceScope} from "../containerBuilders/containerBuilder";

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
    const serviceId = evaluateStringLiteral(statement.arguments[1]);
    const scope = evaluateStringLiteral(statement.arguments[2]);
    const serviceHashKey = `${serviceType.locationPath}:${serviceType.typeName}`;
    context.registrations.instances.push({
        serviceId: serviceId,
        scope: <ServiceScope>scope,
        type: instanceType,
        dependencies: []
    });

    let existingServiceId = context.registrations.services.get(serviceHashKey);
    if (!existingServiceId) {
        context.registrations.services.set(serviceHashKey, serviceId);
    }
    else if (existingServiceId !== serviceId) {
        throw Error(`The service registration key "${serviceId}" can be assigned only to service type of "${serviceHashKey}"`);
    }
}