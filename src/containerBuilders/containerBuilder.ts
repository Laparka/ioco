import {RegistrationModule} from "./registrationModule";
import {DefaultServiceResolver, ServiceResolver} from "../resolvers/serviceResolver";
import {Registrations} from "../visitors/context";
import {ScopeProvider, ServiceProvider} from "../resolvers/scope";
export type InstanceCtor<TService> = {
    new(...args: any[]): TService;
};

export type ServiceScope = "Transient" | "Lifetime" |"Singleton";

export type ContainerBuilder = {
    addModule(module: RegistrationModule): ContainerBuilder;
    addService<TService>(instance: InstanceCtor<TService>, serviceKey: string, scope: ServiceScope): ContainerBuilder;
    addResolver(resolver: ServiceResolver<any>, serviceKey: string): void;
    build(): ServiceProvider;
};

export class TypeScriptContainerBuilder implements ContainerBuilder {
    private readonly _registrations: Registrations;
    private readonly _resolvers: Map<string, ServiceResolver<any>[]>;
    private _registrationPointer: number;
    constructor(registrations: Registrations) {
        this._registrations = registrations;
        this._resolvers = new Map<string, ServiceResolver<any>[]>();
        this._registrationPointer = 0;
    }

    addModule(module: RegistrationModule): ContainerBuilder {
        module.register(this);
        return this;
    }

    addService<TService>(instance: InstanceCtor<TService>, serviceKey: string, scope: ServiceScope): ContainerBuilder {
        const pointer = this._registrationPointer++;
        if (pointer >= this._registrations.instances.length) {
            throw Error(`No more .addService-calls were provided within the registrations array`);
        }

        const instanceRegistration = this._registrations.instances[pointer];
        if (instanceRegistration.serviceId !== serviceKey) {
            throw Error(`The instance registration key does not match for the current instance registration: Expected: "${instanceRegistration.serviceId}", but received "${serviceKey}"`);
        }

        let resolvers = this._resolvers.get(serviceKey);
        if (!resolvers) {
            resolvers = [];
            this._resolvers.set(serviceKey, resolvers);
        }

        resolvers.push(new DefaultServiceResolver(instance, instanceRegistration));
        return this;
    }

    addResolver(resolver: ServiceResolver<any>, serviceKey: string): void {
        let resolvers = this._resolvers.get(serviceKey);
        if (!resolvers) {
            resolvers = [];
            this._resolvers.set(serviceKey, resolvers);
        }

        resolvers.push(resolver);
    }

    build(): ServiceProvider {
        return new ScopeProvider(this._resolvers);
    }
}