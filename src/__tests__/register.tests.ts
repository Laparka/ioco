import {TypeScriptContainerBuilder} from "../containerBuilders/containerBuilder";
import TestStartup from "./instances/startup";
import {listRegistrations} from 'ioco/src/ioco';
import {DatabaseService} from "./instances/databaseService";
import assert from "assert";
import {NotificationService} from "./instances/relatedStartup";

test("Resolves a service with its dependencies", async () => {
    const registrations = await listRegistrations("src/__tests__/instances/startup", "TestStartup");
    const builder = new TypeScriptContainerBuilder(registrations);
    const startup = new TestStartup();
    startup.register(builder);
    const serviceProvider = builder.build();
    const dbService = serviceProvider.resolveOne<DatabaseService>(`DATABASE_SERVICE`);
    assert(dbService);
    dbService.getAsync()

    const notificationService = serviceProvider.resolveOne<NotificationService>("NOTIFICATION_SERVICE");
    assert(notificationService);
    await notificationService.sendAsync("test");
});

test("Generates the registrations map", async () => {
    const registrations = await listRegistrations("src/__tests__/instances/startup", "TestStartup");
});