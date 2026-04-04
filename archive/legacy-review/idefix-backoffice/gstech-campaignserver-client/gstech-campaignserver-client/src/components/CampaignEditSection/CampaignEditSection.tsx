import * as React from "react";
import styled from "styled-components";

import { Button } from "../Button";
import { Plus, Download } from "../../icons";

interface ICampaignEditSection {
  title: string;
  description: string;
  buttonText?: string;
  buttonHandler?: () => void;
  onDownloadCsv?: () => void;
  contactsCount?: string;
  children: React.ReactNode;
  isOpen: boolean;
}

const StyledCampaignEditSection = styled.div`
  display: flex;
  flex-direction: column;

  .campaign-edit-section__description {
    color: ${({ theme }) => theme.palette.blackMiddle};
  }

  .campaign-edit-section__children {
    margin-top: 32px;
  }

  .campaign-edit-section__actions {
    display: flex;

    & > :nth-child(2) {
      margin-left: 12px;
    }
  }

  .campaign-edit-section__button {
    margin-top: 32px;
  }

  .download-csv-block {
    display: flex;
    align-items: center;
    margin-top: 32px;

    &__text {
      margin-left: 12px;
      color: ${({ theme }) => theme.palette.blackDark};
    }

    &__icon {
      width: 20px;
      height: 20px;
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.blackDark};
    }
  }
`;

const CampaignEditSection: React.FC<ICampaignEditSection> = ({
  title,
  description,
  buttonText,
  buttonHandler,
  onDownloadCsv,
  children,
  isOpen
}) => {
  return (
    <StyledCampaignEditSection>
      <h4 className="text-header">{title}</h4>
      <h5 className="campaign-edit-section__description text-main-reg">{description}</h5>
      {isOpen ? <div className="campaign-edit-section__children">{children}</div> : null}
      {!isOpen && buttonText && (
        <div className="campaign-edit-section__actions">
          <Button className="campaign-edit-section__button" appearance="blue" icon={<Plus />} onClick={buttonHandler}>
            {buttonText}
          </Button>
          {onDownloadCsv && (
            <div className="download-csv-block">
              <Button icon={<Download />} onClick={onDownloadCsv}>
                Download CSV
              </Button>
              {/* <p className="download-csv-block__text text-main-med">Contacts in list: {contactsCount} </p>
              <Users className="download-csv-block__icon" /> */}
            </div>
          )}
        </div>
      )}
      {onDownloadCsv && isOpen && (
        <div className="download-csv-block">
          <Button icon={<Download />} onClick={onDownloadCsv}>
            Download CSV
          </Button>
          {/* <p className="download-csv-block__text text-main-med">Contacts in list: {contactsCount} </p>
          <Users className="download-csv-block__icon" /> */}
        </div>
      )}
    </StyledCampaignEditSection>
  );
};

export { CampaignEditSection };
