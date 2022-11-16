import {AccessorType, ImportDefinitions} from "./importVisitors";

export type InstanceRegistration = {
    serviceType: AccessorType;
    instanceType: AccessorType;
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
    resolvers: AccessorType[];
};