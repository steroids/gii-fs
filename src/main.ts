import {NestFactory, Reflector} from '@nestjs/core';
import {DocumentBuilder, SwaggerDocumentOptions, SwaggerModule} from '@nestjs/swagger';
import {ConfigService} from '@nestjs/config';
import {VersioningType} from '@nestjs/common';
import './envInit';
import * as basicAuth from 'express-basic-auth';
import {AppModule} from './AppModule';
import {SchemaSerializer} from './base/infrastructure/filters/SchemaSerializer';
import {CreateDtoPipe} from '@steroidsjs/nest/infrastructure/pipes/CreateDtoPipe';
import {ValidationExceptionFilter} from '@steroidsjs/nest/infrastructure/filters/ValidationExceptionFilter';
import {UserExceptionFilter} from '@steroidsjs/nest/infrastructure/filters/UserExceptionFilter';
import * as process from 'process';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Versioning
    app.setGlobalPrefix('/api/v1');
    app.enableVersioning({
        type: VersioningType.URI,
    });

    // Swagger config
    if (process.env.SWAGGER_URL) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle(configService.get('title') || 'Application')
            .setDescription('Документация REST API')
            .setVersion(configService.get('version') || '1.0')
            .addBearerAuth()
            .build();

        const swaggerOptions:SwaggerDocumentOptions = {
            ignoreGlobalPrefix: false,
        };

        const document = SwaggerModule.createDocument(app, swaggerConfig, swaggerOptions);

        // turn on basic auth to access swagger
        if (process.env.SWAGGER_PASSWORD) {
            app.use(
                [process.env.SWAGGER_URL],
                basicAuth({
                    challenge: true,
                    users: {
                        [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD,
                    },
                }),
            );
        }

        SwaggerModule.setup(process.env.SWAGGER_URL, app, document);
    }

    // Cors
    const origin = [];
    (configService.get('cors.allowDomains') || []).forEach(domain => {
        if (domain.indexOf('://') !== -1) {
            origin.push(domain);
        } else {
            origin.push('https://' + domain);
            origin.push('http://' + domain);
        }
    });
    app.enableCors({
        credentials: true,
        origin,
        methods: (configService.get('cors.allowMethods') || [
            'POST',
            'PUT',
            'GET',
            'OPTIONS',
            'DELETE',
        ]),
        allowedHeaders: configService.get('cors.allowHeaders') || [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-CSRF-Token',

            // For file PUT upload
            'If-None-Match',
            'If-Modified-Since',
            'Cache-Control',
            'X-Requested-With',
            'Content-Disposition',
            'Content-Range',
        ],
    });

    // Validation
    app.useGlobalPipes(new CreateDtoPipe());
    app.useGlobalFilters(new ValidationExceptionFilter());
    app.useGlobalFilters(new UserExceptionFilter());

    app.useGlobalInterceptors(
        new SchemaSerializer(app.get(Reflector)),
    );

    // Start application
    const port = configService.get('port');
    await app.listen(
        port,
        () => console.log(`Server started http://localhost:${port}`), // eslint-disable-line no-console
    );
}

bootstrap();
