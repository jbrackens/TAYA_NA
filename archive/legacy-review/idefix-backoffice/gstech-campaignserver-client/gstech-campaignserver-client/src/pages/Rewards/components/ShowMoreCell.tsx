import * as React from "react";
import { Cell } from "react-table";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { Dropdown, Popup, MenuItem, useConfirmationDialog } from "../../../components";
import { Trash, Edit, MoreVertical, Duplicate } from "../../../icons";
import { removeReward } from "../rewardsSlice";
import { RewardWithOrder } from "../types";
import { AppDispatch } from "../../../redux";

interface IProps {
  cell: Cell<RewardWithOrder>;
  onUpdateReward: (rewardId: number) => void;
  onCopyReward: (rewardId: number) => void;
}

const StyledShowMoreCell = styled.div`
  display: flex;
  align-items: center;
`;

const ShowMoreCell: React.FC<IProps> = ({ cell, onUpdateReward, onCopyReward }) => {
  const dispatch: AppDispatch = useDispatch();
  const openConfirmationDialog = useConfirmationDialog();

  const reward = cell.row.original;

  const handleRemoveReward = React.useCallback(
    async (rewardId: number) => {
      try {
        await openConfirmationDialog();
        dispatch(removeReward(rewardId));
      } catch (error) {
        // ignore
      }
    },
    [dispatch, openConfirmationDialog]
  );

  return (
    <StyledShowMoreCell>
      <Dropdown align="right" button={<MoreVertical />}>
        <Popup>
          <MenuItem value="edit" icon={<Edit />} onClick={() => onUpdateReward(reward.id)}>
            Edit
          </MenuItem>
          <MenuItem value="copy" icon={<Duplicate />} onClick={() => onCopyReward(reward.id)}>
            Copy
          </MenuItem>
          <MenuItem value="remove" icon={<Trash />} red={true} onClick={() => handleRemoveReward(reward.id)}>
            Remove
          </MenuItem>
        </Popup>
      </Dropdown>
    </StyledShowMoreCell>
  );
};

export { ShowMoreCell };
