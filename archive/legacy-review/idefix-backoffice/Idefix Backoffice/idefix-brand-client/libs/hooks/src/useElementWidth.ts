import { RefObject } from "react";

import { useClientRect } from "./useClientRect";

export function useElementWidth(elementRef: RefObject<HTMLDivElement>) {
  const clientRect = useClientRect(elementRef);
  return clientRect.width;
}
