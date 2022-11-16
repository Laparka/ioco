import * as utils from "ioco/src/ioco";
import * as builders from "ioco/src/ioco";
import {RelatedStartup} from "./relatedStartup";
import * as Star from "ioco/src/ioco";


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