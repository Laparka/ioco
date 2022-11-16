import {InstanceCtor, ServiceScope} from "../containerBuilders/containerBuilder";
import {InstanceRegistration} from "../containerBuilders/context";

export type ServiceProvider = {
    get scopeId(): number;
    newScope(): ServiceProvider;
    resolveOne<TService>(serviceKey: string): TService;
    resolveMany<TService>(serviceKey: string): TService[];
    findResolverServiceId(servicePath: string): string;
};

export type ServiceResolver<TService> = {
    resolve(serviceProvider: ServiceProvider): TService;
};

export class ScopeProvider implements ServiceProvider {
    private readonly _resolvers: Map<string, ServiceResolver<any>[]>;
    private readonly _resolversByServicePath: Map<string, string>;

    private _scopeId: number;

    constructor(resolvers: Map<string, ServiceResolver<any>[]>, resolversByServicePath: Map<string, string>) {
        this._resolvers = resolvers;
        this._resolversByServicePath = resolversByServicePath;
        this._scopeId = 1;
    }

    get scopeId(): number {
        return this._scopeId;
    }

    newScope(): ServiceProvider {
        this._scopeId++;
        return this;
    }

    resolveMany<TService>(serviceKey: string): TService[] {
        const resolvers = this._resolvers.get(serviceKey);
        if (!resolvers || resolvers.length === 0) {
            throw Error(`No registered resolver found for the ${serviceKey}`)
        }

        const instances: TService[] = [];
        for(let i = 0; i < resolvers.length; i++) {
            instances.push(resolvers[i].resolve(this));
        }

        return instances;
    }

    resolveOne<TService>(serviceKey: string): TService {
        const resolvers = this._resolvers.get(serviceKey);
        if (!resolvers || resolvers.length === 0) {
            throw Error(`No registered resolver found for the ${serviceKey}`)
        }

        return resolvers[0].resolve(this);
    }

    findResolverServiceId(servicePath: string): string {
        const serviceId = this._resolversByServicePath.get(servicePath);
        if (!serviceId) {
            throw Error(`No registered resolver with the service path "${servicePath}" was found`);
        }

        return serviceId;
    }
}

export class DefaultServiceResolver implements ServiceResolver<any> {
    private readonly _instanceCtor: InstanceCtor<any>;
    private readonly _instanceData: InstanceRegistration;
    private readonly _scope: ServiceScope;

    private readonly _instances: Map<number, any>;

    constructor(instanceCtor: InstanceCtor<any>, instanceData: InstanceRegistration, scope: ServiceScope) {
        this._instanceCtor = instanceCtor;
        this._instanceData = instanceData;
        this._scope = scope;
        this._instances = new Map<number, any>();
    }

    resolve(serviceProvider: ServiceProvider): any {
        let instance;
        switch (this._scope) {
            case "Transient": {
                instance = this._doResolve(serviceProvider);
                break;
            }

            case "Scoped": {
                instance = this._instances.get(serviceProvider.scopeId);
                if (!instance) {
                    instance = this._doResolve(serviceProvider);
                    this._instances.set(serviceProvider.scopeId, instance);
                }

                break;
            }

            case "Singleton": {
                instance = this._instances.get(-1);
                if (!instance) {
                    instance = this._doResolve(serviceProvider);
                    this._instances.set(-1, instance);
                }

                break;
            }

            default: {
                throw Error(`Unknown scope: ${this._scope}`);
            }
        }

        return instance;
    }

    private _doResolve(serviceProvider: ServiceProvider): any {
        const args = [];
        if (this._instanceData.dependencies) {
            for (let i = 0; i < this._instanceData.dependencies.length; i++) {
                const servicePath = this._instanceData.dependencies[i];
                const serviceId = serviceProvider.findResolverServiceId(servicePath);
                const dependency = serviceProvider.resolveOne(serviceId);
                args.push(dependency);
            }
        }

        return new this._instanceCtor(...args);
    }
}