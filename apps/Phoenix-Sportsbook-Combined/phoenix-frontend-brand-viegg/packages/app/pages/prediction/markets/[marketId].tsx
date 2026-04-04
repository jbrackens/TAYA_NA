import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function PredictionMarketDetailPage(props: PageProps) {
  return <Components.Pages.Prediction {...props} view="detail" />;
}

PredictionMarketDetailPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Prediction.namespacesRequired,
  layoutVariant: "prediction-redesign",
});

export default PredictionMarketDetailPage;
