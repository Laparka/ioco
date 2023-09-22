import {RegistrationModule} from "../../containerBuilders/registrationModule";
import {ContainerBuilder as Builder} from "../../containerBuilders/containerBuilder";
import {InMemoryUserService, UserService} from "./user_service";
import * as userServices from './user_service';
import ConsoleLogger from "./consoleLogger";

export class TestStartup implements RegistrationModule {
    register(builder: Builder): void {
        builder.addService<Logger>(ConsoleLogger, "LOGGER", "Singleton");
        builder.addService<UserService>(InMemoryUserService, "USER_SERVICE", "Scoped");

    }
}

export type LogLevel = "TRACE" | "INFO" | "DEBUG" | "ERROR";

export interface Logger {
    log(message: string, level: LogLevel): void;
}