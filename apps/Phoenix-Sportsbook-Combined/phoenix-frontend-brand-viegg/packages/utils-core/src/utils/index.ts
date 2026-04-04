export type MenuItem = {
  key: string;
  href: string;
  label: string;
};

export const isMenuItemActive = (item: MenuItem, path: string): boolean => {
  const itemPath = item.href;
  const isRoot = path === "/";
  if (isRoot) {
    return path === itemPath;
  } else if (!isRoot && itemPath !== "/") {
    return path.indexOf(itemPath) === 0 || path === itemPath;
  }
  return false;
};

export const getStateList = () => {
  const { states } = require("./lists/state-list");
  return states;
};

export const getCountryList = () => {
  const { countries } = require("./lists/country-list");
  return countries;
};
