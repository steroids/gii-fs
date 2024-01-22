import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';

export default () => ({
    name: '@steroidsjs/gii-fs',
    title: 'FS Developer Server',
    version: '1.0',
    cors: {
        allowDomains: [
            '127.0.0.1:9991',
        ],
    },
    project: {
        configRoute: process.argv.at(-1).endsWith('.json')
            ? process.argv.at(-1)
            : (fs.existsSync(path.resolve(require('os').homedir(), 'gii-fs.json'))
                    ? path.resolve(require('os').homedir(), 'gii-fs.json')
                    : path.resolve(process.cwd(), 'gii-fs.json')
            )
    }
});
