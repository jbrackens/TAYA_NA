const FAV_SPORTS = "FavSports";

export type UserPreferences = {
  getFavSports: () => null | Array<string>;
  setFavSports: (games: Array<string>) => void;
  clearFavSports: () => void;
};

export const userPreferences = (): UserPreferences => {
  const getFavSports = () => {
    const sports = sessionStorage.getItem(FAV_SPORTS);
    return sports ? JSON.parse(sports) : sports;
  };

  const setFavSports = (sports: Array<string>) => {
    if (!sports) {
      return;
    }
    sessionStorage.setItem(FAV_SPORTS, JSON.stringify(sports));
  };

  const clearFavSports = () => {
    sessionStorage.removeItem(FAV_SPORTS);
  };

  return {
    getFavSports,
    setFavSports,
    clearFavSports,
  };
};
