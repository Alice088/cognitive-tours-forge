import { main } from './lib/run';

process.exitCode = await main(process.argv.slice(2));
