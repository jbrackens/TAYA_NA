import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function PredictionMarketsPage(props: PageProps) {
  return <Components.Pages.Prediction {...props} view="markets" />;
}

PredictionMarketsPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Prediction.namespacesRequired,
  layoutVariant: "prediction-redesign",
});

export default PredictionMarketsPage;
