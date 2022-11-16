import pkg from './package.json'
import typescript from 'rollup-plugin-typescript2'
import versionInjector from 'rollup-plugin-version-injector'

const version = process.env.VERSION || pkg.version;
const sourceMap = true;

const treeshake = {
    propertyReadSideEffects: false
};

const tsconfig = {
    tsconfigOverride: {
        include: [ 'src' ],
        exclude: [ 'src/__tests__' ],
        compilerOptions: {
            target: 'es6',
            module: 'es6'
        }
    }
}
const versionInjection = versionInjector({
    injectInComments: false,
    injectInTags: {
        fileRegexp: /\.(ts|js|html|css)$/,
        tagId: 'VI',
        dateFormat: 'mmmm d, yyyy HH:MM:ss'
    },
    packageJson: './package.json',
    logLevel: 'info',
    logger: console,
    exclude: []
})
const nodeJsInput = './src/ioco.ts';

const nodeCjs = {
    output: [{
        file: 'lib/ioco.node.cjs.js',
        format: 'cjs'
    }],
    external: ['path', 'fs'],
    plugins: [versionInjection, typescript(tsconfig)],
    treeshake: treeshake,
    input: nodeJsInput
};


const bundles = [];
const env = process.env.BUNDLES || '';
if (env.includes('cjs')) {
    bundles.push(nodeCjs)
}

if (bundles.length === 0) {
    bundles.push(nodeCjs)
}

export default bundles;
