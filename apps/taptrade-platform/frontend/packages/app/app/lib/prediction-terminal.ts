export function isPredictionTerminalRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/floor" ||
    pathname.startsWith("/floor/") ||
    pathname === "/book" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/event/") ||
    pathname === "/predict" ||
    pathname.startsWith("/predict/") ||
    pathname === "/discover" ||
    pathname.startsWith("/discover/") ||
    pathname.startsWith("/market/")
  );
}
