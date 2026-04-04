import { FC } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";

import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

interface Props {
  playerInfo: PlayerWithUpdate | undefined;
  isLoading: boolean;
}

const PlayerStatus: FC<Props> = ({ playerInfo, isLoading }) => {
  if (!playerInfo || isLoading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center">
        <LoadingIndicator />
      </Box>
    );

  const fullName = `${playerInfo.firstName} ${playerInfo.lastName}`;
  const playerId = `${playerInfo.brandId}_${playerInfo.id}`;
  const balance = playerInfo.update.balance;

  return (
    <Box display="flex" justifyContent="space-between">
      <Box display="flex">
        <CopyToClipboard text={playerInfo.username}>
          <Tooltip title="Copy Username">
            <Avatar
              src={`../../assets/brands/${playerInfo.brandId}.png`}
              sx={{ width: 24, height: 24, cursor: "pointer" }}
            />
          </Tooltip>
        </CopyToClipboard>
        <Box display="flex" flexDirection="column" ml={1}>
          <Box display="flex" alignItems="center">
            <CopyToClipboard text={playerId}>
              <Tooltip title="Copy PlayerId">
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "16px",
                    cursor: "pointer"
                  }}
                >
                  {playerId}
                </Typography>
              </Tooltip>
            </CopyToClipboard>
            <CopyToClipboard text={fullName}>
              <Tooltip title="Copy Full Name">
                <Typography
                  component="span"
                  sx={{
                    marginLeft: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    lineHeight: "24px",
                    fontWeight: "bold"
                  }}
                >
                  {fullName}
                </Typography>
              </Tooltip>
            </CopyToClipboard>
          </Box>
          <Typography component="span" sx={{ fontSize: "12px", lineHeight: "16px" }}>
            Balance:{" "}
            {
              <Typography component="span" sx={{ fontSize: "12px", lineHeight: "16px" }}>
                {balance.formatted?.totalBalance} {balance.currencyId}{" "}
                {balance.reservedBalance > 0 && (
                  <Typography component="span" sx={{ fontSize: "12px", lineHeight: "16px" }}>
                    + {balance.formatted.reservedBalance} {balance.currencyId}{" "}
                    <Typography component="span" sx={{ fontSize: "12px", lineHeight: "16px" }}>
                      pending withdrawals
                    </Typography>
                  </Typography>
                )}
              </Typography>
            }
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export { PlayerStatus };
