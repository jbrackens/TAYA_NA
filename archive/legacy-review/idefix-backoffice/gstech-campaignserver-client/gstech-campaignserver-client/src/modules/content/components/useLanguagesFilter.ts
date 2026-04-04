import { useCallback, useMemo, useState } from "react";
import { ContentRow } from "app/types";

export const useLanguagesFilter = (data: ContentRow[]) => {
  const [isLanguagesFilled, setIsLanguagesFilled] = useState<boolean>(true);
  const [filteredLanguages, setFilteredLanguages] = useState<string[]>([]);

  const onChangeIsLanguagesFilled = useCallback(
    (isLanguage: string | number | string[] | boolean) => setIsLanguagesFilled(isLanguage as boolean),
    []
  );

  const onAddLanguageFilter = useCallback(
    (selectedLanguage: string) => {
      if (filteredLanguages.includes(selectedLanguage)) {
        setFilteredLanguages(filteredLanguages.filter(language => language !== selectedLanguage));
      } else setFilteredLanguages([...filteredLanguages, selectedLanguage]);
    },
    [filteredLanguages]
  );

  const filteredData = useMemo(
    () =>
      filteredLanguages.length
        ? data.filter(({ languages }) => {
            const filledLanguages = filteredLanguages.every(filteredLanguage =>
              languages?.find(
                ({ language, isFilled }) => filteredLanguage === language && (isLanguagesFilled ? isFilled : !isFilled)
              )
            );

            return filledLanguages;
          })
        : data,
    [data, filteredLanguages, isLanguagesFilled]
  );

  const resetFilteredLanguages = useCallback(() => setFilteredLanguages([]), []);

  return {
    filteredData,
    isLanguagesFilled,
    filteredLanguages,
    onAddLanguageFilter,
    onChangeIsLanguagesFilled,
    resetFilteredLanguages
  };
};
