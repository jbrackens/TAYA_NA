import React, { FC, useCallback, useState } from "react";
import Box from "@material-ui/core/Box";
import Menu from "@material-ui/core/Menu";
import Button from "@material-ui/core/Button";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import Tooltip from "@material-ui/core/Tooltip";
import { ActiveLimit, ActiveLimitOptions, LimitType } from "app/types";
import Loading from "../../../core/components/Loading";

interface CancelProps {
  name: string;
  limit: ActiveLimit;
  type: LimitType;
  onOpenCancelLimitConfirmationDialog: (
    limit: {
      exclusionKey: string;
      type: LimitType;
    },
    delay: boolean,
  ) => any;
  onOpenRaiseLimitDialog: (limit: ActiveLimit, type: LimitType) => any;
}

const Cancel: FC<CancelProps> = ({
  name,
  limit,
  type,
  onOpenRaiseLimitDialog,
  onOpenCancelLimitConfirmationDialog,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | Element>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Box>
      <Tooltip title="Cancel Limit">
        <Button onClick={handleClick}>{name}</Button>
      </Tooltip>
      <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
        {type !== "selfExclusion" && <MenuItem onClick={onOpenRaiseLimitDialog(limit, type)}>Change limit</MenuItem>}
        {limit.canBeCancelled && (
          <MenuItem onClick={onOpenCancelLimitConfirmationDialog(limit, true)}>
            Cancel limit in {limit.cancellationDays} days
          </MenuItem>
        )}
        <MenuItem onClick={onOpenCancelLimitConfirmationDialog(limit, false)}>Cancel limit now</MenuItem>
      </Menu>
    </Box>
  );
};

interface Props {
  limits: ActiveLimitOptions;
  isLoadingActiveLimits: boolean;
  onSetLimit: any;
  onOpenCancelLimitConfirmationDialog: (
    limit: {
      exclusionKey: string;
      type: LimitType;
    },
    delay: boolean,
  ) => void;
  onOpenRaiseLimitDialog: (limit: ActiveLimit, type: LimitType) => void;
}

const ActiveLimits: FC<Props> = ({
  limits,
  isLoadingActiveLimits,
  onSetLimit,
  onOpenCancelLimitConfirmationDialog,
  onOpenRaiseLimitDialog,
}) => {
  const Limit = ({ type, label }: { type: LimitType; label: string }) => (
    <Box display="flex" alignItems="center" mt={1}>
      <Box width="164px">
        {limits[type] ? (
          <Cancel
            name={label}
            limit={limits[type]}
            type={type}
            onOpenCancelLimitConfirmationDialog={onOpenCancelLimitConfirmationDialog}
            onOpenRaiseLimitDialog={onOpenRaiseLimitDialog}
          />
        ) : (
          <Tooltip title="Set Limit">
            <Button onClick={onSetLimit(type)}>{label}</Button>
          </Tooltip>
        )}
      </Box>
      <Box ml={6}>{limits[type] && <Typography variant="body2">{limits[type].display}</Typography>}</Box>
    </Box>
  );

  return (
    <Box>
      <Box>
        <Typography variant="subtitle2">Active limits</Typography>
      </Box>
      {isLoadingActiveLimits ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3} height="232px">
          <Loading />
        </Box>
      ) : (
        <Box mt={3}>
          <Limit type="sessionLength" label="Maximum play time" />
          <Limit type="selfExclusion" label="Self exlusion" />
          <Limit type="deposit" label="Deposit" />
          <Limit type="timeout" label="Timeout" />
          <Limit type="loss" label="Losses" />
          <Limit type="bet" label="Bets" />
        </Box>
      )}
    </Box>
  );
};

export { ActiveLimits };
