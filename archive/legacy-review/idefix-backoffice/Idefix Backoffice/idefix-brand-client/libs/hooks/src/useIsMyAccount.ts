import { useRouter } from "next/router";

export function useIsMyAccount() {
  const { pathname } = useRouter();

  const isMyAccount = pathname.includes("/loggedin/myaccount");

  return isMyAccount;
}
