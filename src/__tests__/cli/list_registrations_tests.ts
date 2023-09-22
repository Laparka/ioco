import {buildImportTree} from "../../cli/visitors";

test('Must list the dependency tree', async () => {
    const regs = buildImportTree(__dirname, './testStartup.ts');
    console.log(regs);
});