import { Components } from "@phoenix-ui/app";
import { PageProps } from "@phoenix-ui/app/components/pages/types";

function PredictionActivityPage(props: PageProps) {
  return <Components.Pages.Prediction {...props} view="activity" />;
}

PredictionActivityPage.getInitialProps = async () => ({
  namespacesRequired: Components.Pages.Prediction.namespacesRequired,
  layoutVariant: "prediction-redesign",
});

export default PredictionActivityPage;
