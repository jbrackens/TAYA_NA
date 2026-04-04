import { useRouter } from "next/router";

export function useIsLoggedIn() {
  const router = useRouter();

  const isLoggedIn = router.asPath.includes("/loggedin");

  return isLoggedIn;
}
