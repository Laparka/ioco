import {ServiceResolver} from "./serviceResolver";

export type ServiceProvider = {
    newScope(): ServiceProvider;
    resolveOne<TService>(serviceKey: string): TService;
    resolveMany<TService>(serviceKey: string): TService[];
};

export class ScopeProvider implements ServiceProvider {
    private readonly _resolvers: Map<string, ServiceResolver<any>[]>;

    constructor(resolvers: Map<string, ServiceResolver<any>[]>) {
        this._resolvers = resolvers;
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
}