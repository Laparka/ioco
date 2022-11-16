import {ContainerBuilder} from "./containerBuilder";

export type RegistrationModule = {
    register(builder: ContainerBuilder): void;
};