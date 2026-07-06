export const enumToObject = (structure: any) => {
  const keys = Object.keys(structure);
  const values = Object.values(structure);
  return keys.reduce(
    (prev: any, curr: any) => ({
      ...prev,
      [curr]: values[keys.indexOf(curr)],
    }),
    {},
  );
};

export const inverseEnum = (structure: any): { [key: string]: any } =>
  Object.keys(enumToObject(structure)).reduce(
    (prev, curr) => ({
      ...prev,
      [structure[curr]]: curr,
    }),
    {},
  );
