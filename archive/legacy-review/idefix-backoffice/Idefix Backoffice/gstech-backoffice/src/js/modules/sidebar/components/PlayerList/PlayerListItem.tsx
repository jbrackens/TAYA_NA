import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import debounce from "lodash/fp/debounce";
import ListItem from "@material-ui/core/ListItem";
import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import CloseIcon from "@material-ui/icons/Close";
import Divider from "@material-ui/core/Divider";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import ListItemText from "@material-ui/core/ListItemText";
import LockIcon from "@material-ui/icons/Lock";
import EyeIcon from "@material-ui/icons/RemoveRedEye";
import classnames from "classnames";
import { displayType, findFirstAutoWd, formatAutoWdTime, formatPendingTime, getAdditionalInfo } from "../../utils";
import { useStyles } from "../../styles";
import { PlayerWithUpdate } from "app/types";

interface Props {
  player: PlayerWithUpdate;
  isLastPlayer?: boolean;
  isPendingDeposits?: boolean;
  selectedPlayer: number | null;
  filter: string;
  lockedPlayerUserMap: {
    [key: number]: {
      id: number;
      handle: string;
    };
  };
  onClick: () => void;
  onRemove?: (playerId: number) => void;
  searchQuery?: string;
  notStickyPlayer?: PlayerWithUpdate;
}

const PlayerListItem = ({
  player,
  isLastPlayer,
  isPendingDeposits,
  selectedPlayer,
  filter,
  lockedPlayerUserMap,
  onClick,
  onRemove,
  searchQuery,
  notStickyPlayer,
}: Props) => {
  const classes = useStyles();
  const [shouldBlink, setShouldBlink] = useState(false);
  const { fullName, isAccountClosed, pendingTimeOfFirstWD, autoWithdrawals } = getAdditionalInfo(player);
  const isSelected = selectedPlayer === player.id;
  const depositsPending = isPendingDeposits ? isPendingDeposits : player.pendingDeposits || false;
  const firstAutoWithdrawal = autoWithdrawals.length !== 0 ? findFirstAutoWd(autoWithdrawals) : null;
  const delayedAcceptTime = firstAutoWithdrawal ? formatAutoWdTime(firstAutoWithdrawal.delayedAcceptTime) : null;
  const taskType = displayType(player, filter);
  const formattedPendingTime = formatPendingTime(pendingTimeOfFirstWD as string);

  const debouncedSetShouldBlink = useMemo(() => debounce(500, value => setShouldBlink(value)), []);

  useEffect(() => {
    if (!!notStickyPlayer && searchQuery !== "") {
      debouncedSetShouldBlink(true);
    }
  }, [debouncedSetShouldBlink, notStickyPlayer, searchQuery]);

  const handleRemoveLockedPlayer = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove!(player.id);
    },
    [onRemove, player],
  );

  return (
    <Box className={classes.container}>
      <ListItem
        button
        selected={isSelected}
        onClick={isSelected ? undefined : onClick}
        classes={{ root: classes.root }}
        className={classnames({
          [classes.closedAccount]: isAccountClosed,
          [classes.blinker]: shouldBlink,
        })}
      >
        <ListItemAvatar style={{ minWidth: 0 }}>
          <Avatar
            className={classnames(classes.avatar, { [classes.playerOnline]: player.online })}
            src={`/images/logos/${player.brandId}.png`}
          />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography component="p" className={classes.playerName}>
              {fullName} {isAccountClosed && <LockIcon className={classes.lockIcon} />}
              {filter === "withdrawals" && depositsPending && (
                <Typography component="span" className={classes.pendingWd}>
                  Pending
                </Typography>
              )}
            </Typography>
          }
          secondary={
            <>
              <Typography component="span" className={classes.playerSubText}>
                {lockedPlayerUserMap[player.id] ? (
                  <Typography component="span" className={classes.lockedBy}>
                    <EyeIcon className={classes.eyeIcon} />
                    {lockedPlayerUserMap[player.id].handle} working now
                  </Typography>
                ) : (
                  taskType
                )}
              </Typography>
              {filter === "withdrawals" ? (
                !player.withdrawals.length ? null : (
                  <Typography component="span" className={classes.timeHasPassed}>
                    {formattedPendingTime}
                    {firstAutoWithdrawal && (
                      <Typography component="span" className={classes.autoWd}>
                        Auto WD:{" "}
                        {
                          <Typography component="span" className={classes.autoWdTimer}>
                            {delayedAcceptTime}
                          </Typography>
                        }
                      </Typography>
                    )}
                  </Typography>
                )
              ) : null}
            </>
          }
        />
        {onRemove && <CloseIcon onClick={handleRemoveLockedPlayer} className={classes.iconButton} />}
      </ListItem>
      {isSelected && <Box className={classes.indicator} />}
      {!isLastPlayer && <Divider className={classes.divider} variant="inset" />}
    </Box>
  );
};

export default memo(PlayerListItem);
