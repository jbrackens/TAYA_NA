import { RefObject, useLayoutEffect, useState } from "react";
import { useClientRect } from "./useClientRect";

export function useElementOffsetTop(
  elementRef: RefObject<HTMLDivElement>
): number {
  const clientRect = useClientRect(elementRef);
  const pageYOffset = typeof window !== "undefined" ? window.pageYOffset : 0;

  const [elementOffsetTop, setElementOffsetTop] = useState(
    clientRect.top + pageYOffset
  );

  useLayoutEffect(() => {
    setElementOffsetTop(clientRect.top + window.pageYOffset);
  }, [clientRect]);

  return elementOffsetTop;
}
