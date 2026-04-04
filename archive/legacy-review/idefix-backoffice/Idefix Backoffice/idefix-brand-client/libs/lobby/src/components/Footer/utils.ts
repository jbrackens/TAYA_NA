function trimLocale(language: string) {
  const isLocaleExists = language.includes("-");
  const languageCode = isLocaleExists ? language.split("-")[0] : language;

  return languageCode;
}

export { trimLocale };
