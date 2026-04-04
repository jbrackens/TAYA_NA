import { RefObject, useState, useEffect } from "react";

export function useSticky(
  containerRef: RefObject<HTMLElement>,
  offsetTop: number
): boolean {
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const newSticky =
        window.scrollY > containerRef.current.offsetTop - offsetTop;

      if (newSticky !== sticky) {
        setSticky(newSticky);
      }
    };

    handleScroll();
    document.addEventListener("scroll", handleScroll, { passive: true });
    return () => document.removeEventListener("scroll", handleScroll);
  }, [sticky, offsetTop]);

  return sticky;
}
