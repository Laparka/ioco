import {RegistrationModule} from "./registrationModule";
import {DefaultServiceResolver, ScopeProvider, ServiceProvider, ServiceResolver} from "../resolvers/serviceResolver";
import {Registrations} from "../visitors/context";
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
    private readonly _resolversByServicePath: Map<string, string>;

    private _registrationPointer: number;
    private _resolverPointer: number;

    constructor(registrations: Registrations) {
        this._registrations = registrations;
        this._resolvers = new Map<string, ServiceResolver<any>[]>();
        this._resolversByServicePath = new Map<string, string>();

        this._registrationPointer = this._resolverPointer = 0;
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
        let resolvers = this._resolvers.get(serviceKey);
        if (!resolvers) {
            resolvers = [];
            this._resolvers.set(serviceKey, resolvers);
        }

        this._resolversByServicePath.set(`${instanceRegistration.serviceType.locationPath}:${instanceRegistration.serviceType.typeName}`, serviceKey);
        resolvers.push(new DefaultServiceResolver(instance, instanceRegistration));
        return this;
    }

    addResolver(resolver: ServiceResolver<any>, serviceKey: string): void {
        let resolvers = this._resolvers.get(serviceKey);
        if (!resolvers) {
            resolvers = [];
            this._resolvers.set(serviceKey, resolvers);
        }

        const pointer = this._resolverPointer++;
        if (pointer >= this._registrations.resolvers.length) {
            throw Error(`No more .addResolver-calls were provided within the registrations array`);
        }

        const currentResolver = this._registrations.resolvers[pointer];
        this._resolversByServicePath.set(`${currentResolver.locationPath}:${currentResolver.typeName}`, serviceKey);
        resolvers.push(resolver);
    }

    build(): ServiceProvider {
        return new ScopeProvider(this._resolvers, this._resolversByServicePath);
    }
}