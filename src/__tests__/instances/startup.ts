import * as utils from "../../containerBuilders/registrationModule";
import * as builders from "../../containerBuilders/containerBuilder";
import {RelatedStartup} from "./relatedStartup";
import * as Star from "../../containerBuilders/containerBuilder";


const localStartup: utils.RegistrationModule = {
    register(builder: Star.ContainerBuilder): void {
    }
};

export default class TestStartup implements utils.RegistrationModule {
    register(builder: builders.ContainerBuilder): void {
        builder.addModule(localStartup);
        builder.addModule(new RelatedStartup());
    }
}