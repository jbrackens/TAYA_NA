export function filterByKeys<T>(keys: (keyof T)[] = [], query: string, values: T[]): T[] {
  return values.filter(item => keys.some(key => String(item[key]).toLowerCase().includes(query.toLowerCase())));
}
