import React from "react";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import BackIcon from "@material-ui/icons/KeyboardBackspace";
import CircularProgress from "@material-ui/core/CircularProgress";
import ProvidersTable from "./ProvidersTable";
import { PaymentProviderForm } from "../../../forms/payment-provider";
import { PaymentMethodProvider, PaymentProvider } from "app/types";
import Divider from "@material-ui/core/Divider";

interface Props {
  paymentMethodProviders: PaymentMethodProvider | null;
  onGoBack: () => void;
  onOpenDetails: (paymentProvider: PaymentProvider) => void;
  isLoadingProviders: boolean;
}

const PaymentProviders = ({ paymentMethodProviders, onGoBack, onOpenDetails, isLoadingProviders }: Props) => {
  return (
    <Box display="flex" flexDirection="column">
      <Box alignSelf="flex-start">
        <Button onClick={onGoBack} startIcon={<BackIcon />}>
          Go Back
        </Button>
      </Box>
      {isLoadingProviders ? (
        <Box display="flex" justifyContent="center" alignItems="center" width={1} height="200px">
          <CircularProgress size={60} thickness={5} />
        </Box>
      ) : (
        paymentMethodProviders && (
          <Box display="flex" flexDirection="column" mt={3}>
            <Box>
              <Box>
                <Typography variant="subtitle2">{paymentMethodProviders.name}</Typography>
                <Box mt={2}>
                  <PaymentProviderForm paymentMethodProviders={paymentMethodProviders} />
                </Box>
              </Box>
            </Box>

            <Box mt={3}>
              <Divider light />
            </Box>

            <Box mt={2}>
              <ProvidersTable items={paymentMethodProviders.paymentProviders} onOpenDetails={onOpenDetails} />
            </Box>
          </Box>
        )
      )}
    </Box>
  );
};

export default PaymentProviders;
