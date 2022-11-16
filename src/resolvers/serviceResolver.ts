import {InstanceCtor, ServiceScope} from "../containerBuilders/containerBuilder";
import {InstanceRegistration} from "../visitors/context";
import {ServiceProvider} from "./scope";

export type ServiceResolver<TService> = {
    resolve(serviceProvider: ServiceProvider): TService;
};

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
                const dependentServiceId = this._instanceData.dependencies[i];
                const dependentService = serviceProvider.resolveOne(dependentServiceId);
                args.push(dependentService);
            }
        }

        return new this._instanceCtor(args);
    }
}