import { useState, useEffect, useMemo } from "react";

import { useQueryParameter } from "./useQueryParameter";

const GET_DRAWER_PARAM_KEY = "drawer";

const useGetDrawerState = () => {
  const searchParams = useQueryParameter();
  const drawerName = searchParams.get(GET_DRAWER_PARAM_KEY);

  const [mountedDrawer, setMountedDrawer] = useState(drawerName);

  useEffect(() => {
    if (drawerName) {
      setMountedDrawer(drawerName);
    }

    return () => {
      setMountedDrawer(null);
    };
  }, [drawerName]);

  const isOpened = useMemo(() => Boolean(drawerName), [drawerName]);

  return {
    mountedDrawer,
    isOpened
  };
};

export { useGetDrawerState };
