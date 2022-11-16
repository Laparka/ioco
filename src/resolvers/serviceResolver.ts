import {InstanceCtor} from "../containerBuilders/containerBuilder";
import {InstanceRegistration} from "../visitors/context";

export type ServiceProvider = {
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

    constructor(resolvers: Map<string, ServiceResolver<any>[]>, resolversByServicePath: Map<string, string>) {
        this._resolvers = resolvers;
        this._resolversByServicePath = resolversByServicePath;
    }

    newScope(): ServiceProvider {
        return this;
    }

    resolveMany<TService>(serviceKey: string): TService[] {
        return [];
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
    constructor(instanceCtor: InstanceCtor<any>, instanceData: InstanceRegistration) {
        this._instanceCtor = instanceCtor;
        this._instanceData = instanceData;
    }

    resolve(serviceProvider: ServiceProvider): any {
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