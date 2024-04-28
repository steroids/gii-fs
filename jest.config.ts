import type {Config} from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    maxWorkers: 1,
    maxConcurrency: 1,
    modulePaths: ['<rootDir>/src/__tests__'],
    modulePathIgnorePatterns: [
        'dist',
    ],
    testRegex: '.+test\\.ts$',
};

export default config;
