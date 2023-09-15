import * as process from 'process';

export default () => ({
    name: '@steroidsjs/gii-fs',
    title: 'FS Developer Server',
    version: '1.0',
    cors: {
        allowDomains: [
            '127.0.0.1:9350',
        ],
    },
    port: 7800,
    project: {
        configRoute: process.argv.at(-1),
    }
});
