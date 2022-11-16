import {DynamoDBService} from "./dynamoDbService";
import {DatabaseService} from "./databaseService";
import {ContainerBuilder, RegistrationModule, ServiceResolver} from "ioco/src/ioco";

type Logger = {
    log(message: string): void;
};

class ConsoleLogger implements Logger {
    log(message: string): void {
        console.log(message);
    }
}

class Resolver implements ServiceResolver<Logger> {
    resolve(): Logger {
        return new ConsoleLogger();
    }
}

const constantResolver = {
    resolve(): Logger {
        return new ConsoleLogger();
    }
}

export type NotificationService = {
    sendAsync(message: string): Promise<void>;
}

class NullNotificator implements NotificationService {
    private readonly _logger: Logger;
    constructor(logger: Logger) {
        this._logger = logger;
    }

    sendAsync(message: string): Promise<void> {
        this._logger.log(message);
        return Promise.resolve();
    }

}

export class RelatedStartup implements RegistrationModule {
    register(builder: ContainerBuilder): void {
        builder.addService<DatabaseService>(DynamoDBService, "DATABASE_SERVICE", "Lifetime");
        builder.addResolver(constantResolver, "LOGGER");
        builder.addResolver(new Resolver(), "LOGGER");
        builder.addService<NotificationService>(NullNotificator, "NOTIFICATION_SERVICE", "Transient");
    }
}