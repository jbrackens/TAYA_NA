import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";

function OAuth2() {
  const router = useRouter();

  useEffect(() => {
    router.push("/oauth2/clients");
  }, []);

  return <></>;
}

OAuth2.namespacesRequired = [...defaultNamespaces];
export default OAuth2;
