/** This function works only on client side. So it needs to use in useEffect  */
export function isLandscapeOrientation(): boolean {
  return window.matchMedia("(orientation: landscape)").matches;
}
