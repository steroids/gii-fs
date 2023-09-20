import {join} from 'path';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

// We need this environment variables for application project in AppModule,
// so we don't move these variables into ConfigService
// Possible solution: provide modules that require these variables using Nest Dynamic Modules
// https://docs.nestjs.com/fundamentals/dynamic-modules
process.env.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT || 'dev';
process.env.SWAGGER_URL = '/api/docs';
