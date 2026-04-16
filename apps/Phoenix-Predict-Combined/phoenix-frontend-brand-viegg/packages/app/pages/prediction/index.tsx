import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function PredictionHomePage(props: PageProps) {
  return <Components.Pages.Prediction {...props} view="home" />;
}

PredictionHomePage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Prediction.namespacesRequired,
  layoutVariant: "prediction-redesign",
});

export default PredictionHomePage;
