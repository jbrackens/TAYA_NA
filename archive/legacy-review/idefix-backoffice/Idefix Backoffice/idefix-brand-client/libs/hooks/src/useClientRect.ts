import { RefObject, useEffect, useState } from "react";

interface ClientRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export function useClientRect(elementRef: RefObject<HTMLDivElement>) {
  const [clientRect, setClientRect] = useState<ClientRect>({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0
  });

  useEffect(() => {
    const handleResize = () => {
      if (!elementRef.current) return;
      setClientRect(elementRef.current.getBoundingClientRect() as DOMRect);
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return clientRect;
}
