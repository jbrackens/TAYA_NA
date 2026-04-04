import { defaultNamespaces } from "../../providers/translations/defaults";
import { NextPageContext } from "next";
import { securedPage } from "../../utils/auth";
import { TermsAndConditionsForm } from "../../components/terms-and-conditions-form";
import { PunterRoleEnum } from "@phoenix-ui/utils";

function TermsAndConditionsContainer() {
  return <TermsAndConditionsForm />;
}

TermsAndConditionsContainer.namespace = "page-terms-and-conditions";
TermsAndConditionsContainer.getInitialProps = async (ctx: NextPageContext) =>
  securedPage(
    ctx,
    {
      namespacesRequired: [
        ...defaultNamespaces,
        TermsAndConditionsContainer.namespace,
      ],
    },
    [PunterRoleEnum.ADMIN, PunterRoleEnum.TRADER],
  );

export default TermsAndConditionsContainer;
