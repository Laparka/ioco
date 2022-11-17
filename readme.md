<p align="center">
	<a href="https://www.npmjs.com/package/ioco/"><img src="ioco.png" width="150" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ioco">
    <img src="https://img.shields.io/npm/v/ioco.svg" alt="npm version" >
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/npm/l/ioco.svg" alt="license">
  </a>
</p>

<h1 align="center">Ioco</h1>

# Ioco
```shell
npm i ioco
```

Ioco is a basic dependency injection library designed specifically for the TypeScript language.
The library consists of two parts:
- A schema generator
- Dependency resolver

##Usage Examples
The resolvers are using the dependency schema. One way is to prepare a custom dependency schema and initializing the [TypeScriptContainerBuilder](/src/containerBuilders/containerBuilder.ts) with the schema object in constructor.
Another way is to generate a schema using the [ioco CLI command](/src/cli/run.ts) with the -c argument and providing the path to a config file.

###Module Registrars

First, you need to provide an entry module with the registrations:

```typescript
// The location of the file: src/myStartup.ts
import {RegistrationModule, ContainerBuilder} from "ioco";

class ConsoleLogger implements Logger {
    logInfo(message: string): void {
        console.log(`INFO: ${message}`);
    }
}

class SqsNotificationService implements NotificationService {
    private readonly _log: Logger;
    constructor(log: Logger) {
        this._log = log;
    }

    notify(message: any): void {
        this._log.logInfo(JSON.stringify(message));
    }
}

export type Logger = {
    logInfo(message: string): void;
}

export type NotificationService = {
    notify(message: any): void;
}

export class MyStartup implements RegistrationModule {
    register(containerBuilder: ContainerBuilder): void {
        containerBuilder.addService<Logger>(ConsoleLogger, "LOGGER", "Singleton")
        containerBuilder.addService<NotificationService>(SqsNotificationService, "NOTIFICATION_SERVICE", "Transient");
    }
}
```


### Schema Generator

package.json:
```json
{
  ...,
  "scripts": {
    "generate": "ioco -c src/ioco.myStartup.config"
  },
  ...
}
```

src/ioco.myStartup.config:
```json
{
  "entryModule": {
    "path": "src/myStartup.ts",
    "instance": "MyStartup"
  },
  "outputSchemaPath": "src/dependencies.myStartup.json"
}
```
To generate the Dependency schema, use the CLI command:
```shell
npm run generate
```

Ioco generator will analyze the AST of the registration module and generate a schema file with all dependency references

### Runtime
```typescript
import {Registrations} from "ioco";
import {MyStartup, NotificationService} from './myStartup';

const schema = require("./dependencies.myStartup.json");
const startup = new MyStartup();
const containerBuilder = new TypeScriptContainerBuilder(<Registrations>schema);
startup.register(containerBuilder);
const serviceProvider = containerBuilder.build();
const notificationService = serviceProvider.resolveOne<NotificationService>("NOTIFICATION_SERVICE");
notificationService.send({
    id: "2022-11-16T07:18:25.024Z",
    message: "Hello"
})

```