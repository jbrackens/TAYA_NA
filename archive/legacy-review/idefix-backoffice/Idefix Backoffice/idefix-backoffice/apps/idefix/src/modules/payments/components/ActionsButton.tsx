import React, { FC, useCallback, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { PlayerPayment } from "@idefix-backoffice/idefix/types";

interface Props {
  row: PlayerPayment;
  onCancel: (id: string) => void;
  onConfirm: (id: string) => void;
  onEditWagering: (payment: { counterId: number }) => void;
  onCompleteDepositTransaction: (transactionKey: string, transactionId: string) => void;
  paymentAccess: boolean;
}

const ActionsButton: FC<Props> = ({
  row,
  onCancel,
  onConfirm,
  onEditWagering,
  onCompleteDepositTransaction,
  paymentAccess
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const showCancelItem =
    row.type === "withdraw" &&
    (row.status === "pending" || (paymentAccess && (row.status === "accepted" || row.status === "processing")));

  const showDoneItem =
    row.type === "withdraw" &&
    row.status !== "pending" &&
    paymentAccess &&
    (row.status === "accepted" || row.status === "processing");

  const showWRItem = row.type === "deposit" && row.counterId != null;

  const showCompleteItem = row.type === "deposit" && (row.status === "created" || row.status === "pending");

  const showMenu = showCancelItem || showDoneItem || showWRItem || showCompleteItem;

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      {showMenu && (
        <IconButton onClick={handleClick}>
          <MoreVertIcon />
        </IconButton>
      )}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {showCancelItem && (
          <MenuItem color="primary" onClick={() => onCancel(row.key)}>
            Cancel
          </MenuItem>
        )}

        {showDoneItem && (
          <MenuItem color="primary" onClick={() => onConfirm(row.key)}>
            Done
          </MenuItem>
        )}

        {showWRItem && (
          <MenuItem color="primary" onClick={() => onEditWagering(row)}>{`WR ${Math.round(
            (100 * row.counterValue) / row.counterTarget
          )}%`}</MenuItem>
        )}

        {showCompleteItem && (
          <MenuItem color="primary" onClick={() => onCompleteDepositTransaction(row.key, row.transactionId)}>
            Complete
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export { ActionsButton };
