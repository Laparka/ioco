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

export type ImportType = "Named" | "Namespace" | "Default" | "Local";
export type ImportDefinition = AccessorType & {
    aliasTypeName: string;
};

export type ImportDefinitions = {
    names: Map<string, ImportDefinition>;
    aliasesPath: string[];
};

export type AccessorType = {
    locationPath: string;
    typeName: string;
    importType: ImportType;
    isExternal: boolean;
}