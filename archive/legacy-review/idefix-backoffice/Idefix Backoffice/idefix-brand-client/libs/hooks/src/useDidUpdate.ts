import { useRef, useEffect } from "react";

export function useDidUpdate(callback: () => void, deps: any[]) {
  const hasMount = useRef(false);

  useEffect(() => {
    if (hasMount.current) {
      callback();
    } else {
      hasMount.current = true;
    }
  }, deps);
}
