import fs from "fs";
import argParser from "yargs-parser";
import process from "process";
import path from "path";

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

export * from './../containerBuilders/context';

