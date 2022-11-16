import {listRegistrations} from "./visitors";
import fs from "fs";
import argParser from "yargs-parser";
import process from "process";

async function writeRegistrationsAsync(startupPath: string, startupModuleName: string, outputSchemaFile: string): Promise<void> {
    const schema = await listRegistrations(startupPath, startupModuleName);
    await fs.promises.writeFile(outputSchemaFile, JSON.stringify(schema), {encoding: "utf8"});
}

const command = argParser(process.argv.slice(2), {
    configuration: {"camel-case-expansion": false}
});

const configFile = command["c"];
if (!configFile) {
    throw Error(`The config file path is missing`);
}

if (!fs.existsSync(configFile)) {
    throw Error(`The config file is missing at the given path ${configFile}`);
}

const config = JSON.parse(fs.readFileSync(configFile, {encoding: "utf8"}));
const entryModule = config["entryModule"];
const outputSchemaFilePath = config["outputSchemaPath"]
if (!entryModule || !entryModule["path"] || !entryModule["instance"]) {
    throw Error(`The entryModule parameters [path, instance] are required`);
}

if (!outputSchemaFilePath) {
    throw Error(`The outputSchemaPath value is required`);
}

Promise.allSettled([writeRegistrationsAsync(entryModule["path"], entryModule["instance"], outputSchemaFilePath)])
    .catch(reason => console.error(reason));

export * from './visitors/addModuleVisitor';
export * from './visitors/addResolverVisitor';
export * from './visitors/addServiceVisitor';
export * from './visitors/dependencies';
export * from './visitors/importVisitors';
export * from './visitors/index';
export * from './visitors/utils';

export * from './../containerBuilders/context';

