import process from "process";
import argParser from "yargs-parser";
import {existsSync, readFileSync} from "fs";
const command = argParser(process.argv.slice(2), {
    configuration: {"camel-case-expansion": false}
});

const configFile = command["c"];
if (!configFile) {
    throw Error(`The config file path is missing`);
}

if (!existsSync(configFile)) {
    throw Error(`The config file is missing at the given path ${configFile}`);
}

const config = JSON.parse(readFileSync(configFile, {encoding: "utf8"}));
const entryModule = config["entryModule"];
const outputDir = config["outputDir"]
if (!entryModule || !entryModule["path"] || !entryModule["instance"]) {
    throw Error(`The entryModule parameters [path, instance] are required`);
}

if (!outputDir) {
    throw Error(`The outputDir value is required`);
}