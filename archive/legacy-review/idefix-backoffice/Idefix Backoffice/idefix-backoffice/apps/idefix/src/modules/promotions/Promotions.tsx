import { FC } from "react";
import Box from "@mui/material/Box";
import { usePromotions } from "./hooks";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

import { LoadingIndicator } from "@idefix-backoffice/idefix/components";
import { PromotionsTable } from "./components/PromotionsTable";

const Promotions: FC = () => {
  const { promotions, isLoadingPromotions, segments, isLoadingSegments } = usePromotions();

  return (
    <Box display="flex" flexDirection="column" flexGrow={1} paddingBottom={12}>
      {isLoadingSegments ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <LoadingIndicator />
        </Box>
      ) : (
        !!segments.length && (
          <>
            <Box
              sx={{
                display: "flex",
                padding: 1,
                justifyContent: "center",
                flexWrap: "wrap",
                "& > *": {
                  margin: 1
                }
              }}
            >
              {segments.map(segment => (
                <Chip label={segment} variant="outlined" />
              ))}
            </Box>
            <Box mt={3} mb={3}>
              <Divider light />
            </Box>
          </>
        )
      )}

      <PromotionsTable isLoading={isLoadingPromotions} items={promotions} />
    </Box>
  );
};

export { Promotions };
