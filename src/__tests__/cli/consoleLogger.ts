import {Logger, LogLevel} from "./testStartup";

export default class ConsoleLogger implements  Logger {
    log(message: string, level: LogLevel): void {
        switch (level) {
            case "TRACE": {
                console.trace(message);
                break
            }

            case "INFO":{
                console.info(message);
                break;
            }

            case "DEBUG": {
                console.debug(message);
                break
            }

            case "ERROR":{
                console.error(message);
                break;
            }
        }
    }
}