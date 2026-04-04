import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";

function Authentication() {
  const router = useRouter();

  useEffect(() => {
    router.push("/authentication/rsa-keys");
  }, []);

  return <></>;
}

Authentication.namespacesRequired = [...defaultNamespaces];
export default Authentication;
