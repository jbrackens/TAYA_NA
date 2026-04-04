import React, { FC } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import BackIcon from "@mui/icons-material/KeyboardBackspace";

import { PaymentMethodProvider, PaymentProvider } from "@idefix-backoffice/idefix/types";
import { PaymentProviderForm } from "@idefix-backoffice/idefix/forms";
import { ProvidersTable } from "./ProvidersTable";

interface Props {
  paymentMethodProviders: PaymentMethodProvider | null;
  onGoBack: () => void;
  onOpenDetails: (paymentProvider: PaymentProvider) => void;
  isLoadingProviders: boolean;
}

const PaymentProviders: FC<Props> = ({ paymentMethodProviders, onGoBack, onOpenDetails, isLoadingProviders }) => {
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

export { PaymentProviders };
