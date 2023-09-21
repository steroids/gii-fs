import * as process from 'process';
import * as path from 'path';

export default () => ({
    name: '@steroidsjs/gii-fs',
    title: 'FS Developer Server',
    version: '1.0',
    cors: {
        allowDomains: [
            '127.0.0.1:9350',
        ],
    },
    project: {
        configRoute: process.argv.at(-1).endsWith('.json')
            ? process.argv.at(-1)
            : path.resolve(require('os').homedir(), 'gii-fs.json'),
    }
});
