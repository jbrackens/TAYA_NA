import { useEffect, useRef } from "react";

const useMounted = () => {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    }

    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted.current;
};

export { useMounted };
