import { useRouter } from "next/router";

function useIsBetby(): boolean {
  const { asPath } = useRouter();
  return asPath.includes("/sports/betby");
}

export { useIsBetby };
