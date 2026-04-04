import { useRouter } from "next/router";
import { useEffect } from "react";
import { defaultNamespaces } from "../defaults";

function RuleConfiguration() {
  const router = useRouter();

  useEffect(() => {
    router.push("/rule-configuration/events");
  }, []);

  return <></>;
}

RuleConfiguration.namespacesRequired = [...defaultNamespaces];
export default RuleConfiguration;
