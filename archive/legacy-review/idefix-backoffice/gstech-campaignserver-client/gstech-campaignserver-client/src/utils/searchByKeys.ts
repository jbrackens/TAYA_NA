export default function <T>(keys: string[], query: string, values: T[]): T[] {
  return values.filter(item =>
    keys.some(key =>
      String(item[key as keyof T])
        .toLowerCase()
        .includes(query.toLowerCase())
    )
  );
}
