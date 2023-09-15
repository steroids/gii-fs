import {NestFactory} from '@nestjs/core';
import {CommandModule, CommandService} from 'nestjs-command';
import './envInit';
import {AppModule} from './AppModule';

process.env.APP_IS_CLI = '1';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['warn', 'error'], // only errors
    });

    try {
        await app.select(CommandModule).get(CommandService).exec();
    } catch (error) {
        console.error(error); // eslint-disable-line no-console
    }

    await app.close();
}

bootstrap();
