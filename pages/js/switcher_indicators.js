var switcherProfiles = {};

switcherProfiles.zimaleto = {1: 'Зима', 0: 'Лето', 2: 'Авто'};

switcherProfiles.mode = {
    1: 'Остановка',
    2: 'Подготовка',
    4: 'Блокировка',
    8: 'Продувка',
    16: 'Прогрев',
    32: 'Жалюзи',
    64: 'Вентилятор'
};

switcherProfiles.engineTypes = {
    1: 'ПВ',
};

const switcherIndicators = {
    "main": {

        "switcher1": {
            variants: switcherProfiles.zimaleto
        },

        "switcher2": {
            variants: switcherProfiles.mode
        },

        "switcher3": {
            variants: switcherProfiles.zimaleto
        },

        "switcher4": {
            variants: switcherProfiles.mode
        },

        "switcher5": {
            variants: switcherProfiles.zimaleto
        },

        "switcher6": {
            variants: switcherProfiles.mode
        },

        "specs1": {

        }


    },

    getValue: (sectionName, switcherId, numValue) => {
        if (!switcherIndicators[sectionName]) return "not_section";
        if (!(switcherIndicators[sectionName])[switcherId]) return "not_switcher";
        if (!((switcherIndicators[sectionName])[switcherId]).variants) return "not_variants";
        if (!((switcherIndicators[sectionName])[switcherId]).variants[numValue]) return "not_item";
        return ((switcherIndicators[sectionName])[switcherId]).variants[numValue];
    }
};
