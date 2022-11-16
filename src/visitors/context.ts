import {AccessorType, ImportDefinitions} from "./importVisitors";
import {ServiceScope} from "../containerBuilders/containerBuilder";

export type InstanceRegistration = {
    serviceId: string;
    type: AccessorType;
    scope: ServiceScope;
    dependencies?: string[];
};

export type TraversalContext = {
    registrationFilePath: string;
    registrationDirPath: string;
    imports: ImportDefinitions;
    startupName?: string;
    registrations: Registrations;
};

export type Registrations = {
    instances: InstanceRegistration[];
    services: Map<string, string>;
};