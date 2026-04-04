import * as React from "react";
import { Cell } from "react-table";
import styled from "styled-components";
import { ContentRow, ContentType } from "app/types";
import { useHistory, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";

import { Dropdown, Popup, MenuItem, useConfirmationDialog } from "../../../components";
import { Duplicate, MoreVertical, Trash } from "../../../icons";
import { removeContent, duplicateContent } from "../";
import { AppDispatch } from "../../../redux";
import { unwrapResult } from "@reduxjs/toolkit";
import { CONTENT_TYPES } from "../../../utils/constants";

interface IProps {
  cell: Cell<ContentRow>;
  contentType: ContentType;
}

const StyledShowMoreCell = styled.div`
  display: flex;
  align-items: center;
`;
interface Params {
  brandId: string;
}

const ShowMoreCell: React.FC<IProps> = ({ cell, contentType }) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();
  const { push } = useHistory();
  const openConfirmationDialog = useConfirmationDialog();

  const { id } = cell.row.original;

  const handleRemoveContent = React.useCallback(async () => {
    try {
      await openConfirmationDialog();
      await dispatch(removeContent(id));
    } catch (error) {
      // ignore
    }
  }, [dispatch, id, openConfirmationDialog]);

  const handleDuplicateContent = React.useCallback(async () => {
    const response = await dispatch(duplicateContent({ contentId: id, type: contentType, brandId }));
    if (duplicateContent.fulfilled.match(response)) {
      const { id } = unwrapResult(response);
      contentType === CONTENT_TYPES.landingPage || contentType === CONTENT_TYPES.banner
        ? push(`/${brandId}/${contentType}/${id}`)
        : push(`/${brandId}/content/${contentType}?details=${id}`);
    }
  }, [dispatch, push, id, contentType, brandId]);

  return (
    <StyledShowMoreCell>
      <Dropdown align="right" button={<MoreVertical />}>
        <Popup>
          <MenuItem value="remove" icon={<Trash />} red={true} onClick={handleRemoveContent}>
            Remove
          </MenuItem>
          <MenuItem value="duplicate" icon={<Duplicate />} onClick={handleDuplicateContent}>
            Duplicate
          </MenuItem>
        </Popup>
      </Dropdown>
    </StyledShowMoreCell>
  );
};

export { ShowMoreCell };
