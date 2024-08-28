// src/utils/i18n.ts

import en from '../locales/en.json';

const languages: { [key: string]: { [key: string]: string } } = {
    en: en as { [key: string]: string }
};

export const translate = (key: string, language: string = 'en', values: { [key: string]: string } = {}): string => {
    const lang = languages[language] || languages.en; // Default to English if language not supported
    let translation = lang[key] || key; // Return the key itself if no translation found

    // Replace placeholders with corresponding values
    Object.keys(values).forEach((placeholder) => {
        translation = translation.replace(`{${placeholder}}`, values[placeholder]);
    });

    return translation;
};
