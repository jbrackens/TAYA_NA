import * as React from "react";
import { Link, useHistory } from "react-router-dom";
import styled from "styled-components";
import format from "date-fns/format";
import parseISO from "date-fns/parseISO";
import startCase from "lodash/startCase";
import isNil from "lodash/isNil";
import { ContentType } from "app/types";
import { BackButton, IconButton, Dropdown, Popup, MenuItem } from "../../../components";
import { MoreVertical, Trash } from "../../../icons";

const StyledContentDetailsLayout = styled.div`
  .content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &__block {
      display: flex;
      align-items: center;
      .date {
        color: ${({ theme }) => theme.palette.blackMiddle};
      }

      & > :not(:first-child) {
        margin-left: 16px;
      }
    }
  }
`;

interface Props {
  children: React.ReactNode;
  contentType: ContentType;
  submitButton: React.ReactElement;
  backUrl?: string;
  contentId?: number;
  lastSaved?: string;
  onRemove?: (id: number) => void;
}

const ContentDetailsLayout: React.FC<Props> = ({
  children,
  contentId,
  contentType,
  submitButton,
  backUrl,
  lastSaved,
  onRemove
}) => {
  const contentTypeTitle = startCase(contentType);
  const { goBack } = useHistory();
  return (
    <StyledContentDetailsLayout>
      <div className="content-header">
        <div className="content-header__block">
          {backUrl ? (
            <Link to={backUrl}>
              <BackButton type="button" />
            </Link>
          ) : (
            <BackButton type="button" onClick={goBack} />
          )}

          <h1 className="text-header-big">
            {!isNil(contentId) ? `${contentTypeTitle} Details` : `New ${contentTypeTitle}`}
          </h1>
        </div>
        <div className="content-header__block">
          {lastSaved && (
            <span className="date text-main-reg">{`Last saved ${format(
              parseISO(lastSaved),
              "dd.MM.yyyy HH:mm"
            )}`}</span>
          )}
          {submitButton}
          {!isNil(contentId) && (
            <Dropdown
              align="right"
              button={
                <IconButton>
                  <MoreVertical />
                </IconButton>
              }
            >
              <Popup>
                {onRemove && (
                  <MenuItem value="remove" icon={<Trash />} red onClick={() => onRemove(contentId)}>
                    Remove
                  </MenuItem>
                )}
              </Popup>
            </Dropdown>
          )}
        </div>
      </div>
      {children}
    </StyledContentDetailsLayout>
  );
};

export { ContentDetailsLayout };
