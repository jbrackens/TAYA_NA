import { useState, useEffect } from "react";
enum DirectionEnum {
  SCROLL_UP = "SCROLL_UP",
  SCROLL_DOWN = "SCROLL_DOWN",
}

export const useScrollDirection = () => {
  const [scrollDir, setScrollDir] = useState<null | DirectionEnum>(null);

  useEffect(() => {
    const threshold = 0;
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.pageYOffset;

      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false;
        return;
      }

      setScrollDir(
        scrollY > lastScrollY
          ? DirectionEnum.SCROLL_DOWN
          : DirectionEnum.SCROLL_UP,
      );
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollDir;
};
