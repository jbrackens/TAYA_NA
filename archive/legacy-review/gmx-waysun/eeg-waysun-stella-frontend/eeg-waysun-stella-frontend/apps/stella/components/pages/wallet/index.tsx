import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";

function Wallet() {
  const router = useRouter();

  useEffect(() => {
    router.push("/wallet/currencies");
  }, []);

  return <></>;
}

Wallet.namespacesRequired = [...defaultNamespaces];
export default Wallet;
