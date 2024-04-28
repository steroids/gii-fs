import {IGiiFile} from '../../project/usecases/parsers/file';

export const mockFile: IGiiFile = {
    id: 'src/auth/domain/dtos/AuthConfirmLoginDto.ts',
    path: '/Users/kuzy/KozhinDev/solyanka/backend-api/src/auth/domain/dtos/AuthConfirmLoginDto.ts',
    name: 'AuthConfirmLoginDto',
    code: "import {StringField} from '@steroidsjs/nest/infrastructure/decorators/fields';\n"
      + '\n'
      + 'export const testConst1 = false; \n'
      + 'export const testConst2 = 123; \n'
      + "export const testConst3 = 'testConst'; \n"
      + '\n'
      + '/**\n'
      + '* Вызов метода get\n'
      + '* @param url URL для HTTP-запроса.\n'
      + '* @param params Параметры для запроса.\n'
      + '*/\n'
      + "@Api('auth')\n"
      + "@TestDecorator({name: 'Ivan', count: 1})\n"
      + 'export class AuthConfirmLoginDto {\n'
      + '    @StringField({\n'
      + "        label: 'uid - сессии',\n"
      + '        required: true,\n'
      + '    })\n'
      + '    uid: string;\n'
      + '\n'
      + '    @StringField({\n'
      + "        label: 'Code',\n"
      + '        required: true,\n'
      + '    })\n'
      + '    code: string;\n'
      + '\n'
      + '    newProperty: number[];\n'
      + '}\n',
};
