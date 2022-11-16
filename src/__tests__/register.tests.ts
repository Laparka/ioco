import {TypeScriptContainerBuilder} from "../containerBuilders/containerBuilder";
import TestStartup from "./instances/startup";
import {listRegistrations} from '../visitors';
import {DatabaseService} from "./instances/databaseService";

test("Resolves a service with its dependencies", async () => {
    const registrations = await listRegistrations("src/__tests__/instances/startup", "TestStartup");
    const builder = new TypeScriptContainerBuilder(registrations);
    const startup = new TestStartup();
    startup.register(builder);
    const serviceProvider = builder.build();
    const service = serviceProvider.resolveOne<DatabaseService>(`DATABASE_SERVICE`);
    service.getAsync()
});

test("Generates the registrations map", async () => {
    const registrations = await listRegistrations("src/__tests__/instances/startup", "TestStartup");
});