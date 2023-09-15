import BaseEnum from '@steroidsjs/nest/domain/base/BaseEnum';

export enum BaseLanguageEnum {
    EN = 'en',
    RU = 'ru',
}

export default class LanguageEnum extends BaseEnum {
    static EN = BaseLanguageEnum.EN;

    static RU = BaseLanguageEnum.RU;

    static getLabels() {
        return {
            [this.RU]: 'Russian',
            [this.EN]: 'English',
        };
    }
}
