import * as React from "react";
import { useRouter } from "next/router";

type RouterEvent =
  | "routeChangeStart"
  | "routeChangeComplete"
  | "routeChangeError"
  | "beforeHistoryChange"
  | "hashChangeStart"
  | "hashChangeComplete";

export function useRouterEventListener(eventName: RouterEvent, handler: any) {
  const router = useRouter();

  React.useEffect(() => {
    router.events.on(eventName, handler);

    return () => {
      router.events.off(eventName, handler);
    };
  }, []);
}
