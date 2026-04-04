import * as React from "react";
import { useHistory, useRouteMatch } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Cell } from "react-table";
import styled from "styled-components";
import { Game } from "app/types";

import { addGame, removeGame, selectGameById } from "../gamesSlice";
import { Dropdown, Popup, MenuItem, useConfirmationDialog } from "../../../components";
import { Trash, Edit, MoreVertical } from "../../../icons";
import { fetchBrandThumbnails, selectBrands, selectThumbnailById } from "../../../modules/app";
import { AppDispatch, RootState } from "../../../redux";
import { getThumbnailsForBrand, findThumbnailIdByKey, getNewGame } from "../utils";

interface IProps {
  cell: Cell<Game>;
  brandId: string;
  onUpdateGame: (gameId: number) => void;
}

const StyledShowMoreCell = styled.div`
  display: flex;
  align-items: center;
`;

const ShowMoreCell: React.FC<IProps> = ({ cell, brandId, onUpdateGame }) => {
  const dispatch: AppDispatch = useDispatch();
  const brands = useSelector(selectBrands);
  const { id: gameId, thumbnailId } = cell.row.original;
  const game = useSelector((state: RootState) => selectGameById(state, gameId))!;
  const thumbnail = useSelector((state: RootState) => selectThumbnailById(state, thumbnailId));
  const brandList = brands.filter(({ id }) => id !== brandId).map(({ id }) => id);
  const { url } = useRouteMatch();
  const { push } = useHistory();
  const openConfirmationDialog = useConfirmationDialog();

  const handleCreateGameCopy = React.useCallback(
    (newBrandId: string) => {
      dispatch(fetchBrandThumbnails(newBrandId));
      push({
        pathname: url,
        search: `drawer=copy-game&id=${gameId}&newBrandId=${newBrandId}`,
        state: { hasPrevRoute: true }
      });
    },
    [dispatch, gameId, push, url]
  );

  const handleCreateGameCopyToAll = React.useCallback(
    (newBrandIds: string[]) => {
      const copyGame = async (newBrandId: string, game: Game) => {
        const thumbnailKey = thumbnail?.key;
        const thumbnails = await getThumbnailsForBrand(newBrandId);
        const newThumbnailId = findThumbnailIdByKey(thumbnailKey, thumbnails) || null;
        const gameDraft = getNewGame(newBrandId, game);

        dispatch(addGame({ ...gameDraft, thumbnailId: newThumbnailId }));
      };

      newBrandIds.forEach(brandId => {
        copyGame(brandId, game);
      });
    },
    [dispatch, game, thumbnail]
  );

  const handleRemoveGame = React.useCallback(
    async (gameId: number) => {
      try {
        await openConfirmationDialog();
        dispatch(removeGame(gameId));
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
          <MenuItem value="edit" icon={<Edit />} onClick={() => onUpdateGame(gameId)}>
            Edit
          </MenuItem>
          {brandList.map(
            id =>
              brandId !== id && (
                <MenuItem
                  key={id}
                  value={`create-copy-on-${id}`}
                  onClick={() => handleCreateGameCopy(id)}
                  pathToImg={`/images/logos/${id}.png`}
                >
                  {`Create copy on ${id}`}
                </MenuItem>
              )
          )}
          <MenuItem value="create-copy-on-all" onClick={() => handleCreateGameCopyToAll(brandList)}>
            Create copy on all
          </MenuItem>
          <MenuItem value="remove" icon={<Trash />} red={true} onClick={() => handleRemoveGame(gameId)}>
            Remove
          </MenuItem>
        </Popup>
      </Dropdown>
    </StyledShowMoreCell>
  );
};

export { ShowMoreCell };
