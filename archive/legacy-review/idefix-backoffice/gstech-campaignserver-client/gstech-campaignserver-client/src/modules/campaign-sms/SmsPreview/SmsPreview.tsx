import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import map from "lodash/map";

import { getSmsState } from "../";
import { getSmsPreview, getSmsPreviewState } from "./smsPreviewSlice";
import { Button, DrawerContent, DrawerHeader, Loader } from "../../../components";
import { AppDispatch } from "../../../redux";

interface SmsPreviewProps {
  onClose: () => void;
}

const StyledSmsPreviewContent = styled.div`
  display: flex;
  justify-content: center;
  width: 432px;
  height: 100%;

  .sms-preview-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .sms-preview-wrapper__content {
    margin-top: 16px;
    width: 100%;
    height: 100%;

    & > :not(:first-child) {
      margin-top: 16px;
    }
  }

  .content-item {
    & > span {
      color: rgba(0, 0, 0, 0.64);
    }
  }
`;

const SmsPreview: React.FC<SmsPreviewProps> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const {
    smsTemplate: { contentId }
  } = useSelector(getSmsState);
  const { isLoading, data } = useSelector(getSmsPreviewState);

  React.useEffect(() => {
    if (contentId && !data) {
      dispatch(getSmsPreview({ contentId }));
    }
  }, [dispatch, contentId, data]);

  if (isLoading) {
    return <Loader wrapped />;
  }

  return (
    <>
      <DrawerHeader
        actions={
          <Button appearance="flat" onClick={onClose}>
            Close
          </Button>
        }
      >
        Sms Preview
      </DrawerHeader>
      <DrawerContent>
        <StyledSmsPreviewContent>
          <div className="sms-preview-wrapper">
            <div className="sms-preview-wrapper__content">
              {data &&
                map(data, (value, key) => (
                  <p key={key} className="content-item text-main-reg">
                    <span>{key.toUpperCase()} —</span> {value ? value : "Empty"}
                  </p>
                ))}
            </div>
          </div>
        </StyledSmsPreviewContent>
      </DrawerContent>
    </>
  );
};

export { SmsPreview };
