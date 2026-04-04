import { useEffect, useState } from "react";

export function useLockBodyScroll(locked: boolean) {
  const [actualLocked, setActualLocked] = useState(locked);

  useEffect(() => {
    requestAnimationFrame(() => setActualLocked(locked));
  }, [locked]);

  useEffect(() => {
    if (actualLocked) {
      document.body.style.overflowY = "hidden";
      return () => {
        document.body.style.overflowY = "visible";
      };
    }
  }, [actualLocked]);
}
