import { RefObject, MutableRefObject, useEffect } from "react";

export function useOutsideClick(
  elementRef: RefObject<HTMLElement> | MutableRefObject<HTMLElement>,
  onClick: () => void
) {
  const handleClick = (event: MouseEvent) => {
    if (elementRef && elementRef.current) {
      if (elementRef.current.contains(event.target as HTMLElement)) {
        return;
      } else if (elementRef.current !== undefined) {
        return onClick();
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  });
}
