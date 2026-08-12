export function isPredictionTerminalRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/floor" ||
    pathname.startsWith("/floor/") ||
    pathname === "/predict" ||
    pathname.startsWith("/predict/") ||
    pathname === "/discover" ||
    pathname.startsWith("/discover/") ||
    pathname.startsWith("/market/")
  );
}
