import {build} from 'esbuild';
await build({entryPoints:['src/passkey-core.js'],outfile:'dist/passkey-core.bundle.mjs',bundle:true,platform:'browser',format:'esm',target:'es2022',conditions:['workerd','browser','import','default'],logLevel:'info'});
