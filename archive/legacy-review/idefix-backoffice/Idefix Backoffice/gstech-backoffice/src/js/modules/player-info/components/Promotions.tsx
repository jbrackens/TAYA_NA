import React, { memo } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import { makeStyles } from "@material-ui/styles";
import Loading from "../../../core/components/Loading";
import { Theme } from "@material-ui/core/styles";
import { ActiveLimitOptions, PlayerDraft } from "app/types";

const useStyles = makeStyles((theme: Theme) => ({
  paper: {
    padding: theme.spacing(3),
    height: "100%",
  },
  subTitle: {
    color: theme.colors.blackMiddle,
  },
  labelRoot: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
  },
  labelText: theme.typography.h3,
}));

interface Props {
  promotions?: { allowEmailPromotions: boolean; allowSMSPromotions: boolean; activated: boolean; testPlayer: boolean };
  activeLimits: ActiveLimitOptions;
  isAccountClosed: boolean;
  roles?: string[];
  onToggle: (type: keyof PlayerDraft) => (e: any, value: any) => void;
}

const Promotions = ({ promotions, onToggle, activeLimits, isAccountClosed, roles }: Props) => {
  const classes = useStyles();
  const subTitle = activeLimits?.selfExclusion || isAccountClosed;

  return (
    <>
      <Box>
        <Typography variant="subtitle2">Promotional Info</Typography>
        {subTitle && (
          <Typography variant="h6">
            Player excluded from all marketing due to self exclusion or account closure
          </Typography>
        )}
      </Box>
      {promotions == null ? (
        <Box display="flex" justifyContent="center">
          <Loading size={60} thickness={5} />
        </Box>
      ) : (
        <Box mt={3}>
          <Box>
            <FormControlLabel
              control={<Switch checked={promotions.allowEmailPromotions} onChange={onToggle("allowEmailPromotions")} />}
              label="Allow email promotions"
              labelPlacement="start"
              classes={{ root: classes.labelRoot, label: classes.labelText }}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={<Switch checked={promotions.allowSMSPromotions} onChange={onToggle("allowSMSPromotions")} />}
              label="Allow SMS promotions"
              labelPlacement="start"
              classes={{ root: classes.labelRoot, label: classes.labelText }}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={<Switch checked={promotions.activated} onChange={onToggle("activated")} />}
              label="Email address activated"
              labelPlacement="start"
              classes={{ root: classes.labelRoot, label: classes.labelText }}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={<Switch checked={promotions.testPlayer} onChange={onToggle("testPlayer")} />}
              label="Test player"
              labelPlacement="start"
              disabled={!roles?.includes("administrator")}
              classes={{ root: classes.labelRoot, label: classes.labelText }}
            />
          </Box>
        </Box>
      )}
    </>
  );
};

export default memo(Promotions);
