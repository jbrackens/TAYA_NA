import { useEffect } from "react";

export const useScroll = (callback: () => void, deps: any[]) => {
  useEffect(() => {
    window.addEventListener("scroll", callback);
    return () => {
      window.removeEventListener("scroll", callback);
    };
  }, deps);
};
