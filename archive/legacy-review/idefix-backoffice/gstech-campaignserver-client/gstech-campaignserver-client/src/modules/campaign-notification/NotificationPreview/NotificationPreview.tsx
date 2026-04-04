import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";

import { getNotificationState } from "../campaignNotificationSlice";
import { getNotificationPreview, getNotificationPreviewState } from "./notificationPreviewSlice";
import { selectLanguageOptions } from "../../app";
import { Button, DrawerContent, DrawerHeader, Loader, Select } from "../../../components";
import { AppDispatch } from "../../../redux";

interface INotificationPreviewProps {
  onClose: () => void;
}

const StyledNotificationPreviewContent = styled.div`
  display: flex;
  justify-content: center;
  width: 432px;
  height: 100%;

  .loader-wrapper {
    width: 20px;
    height: 20px;
  }

  .notification-preview-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .notification-preview-wrapper__select {
    width: max-content;
  }

  .notification-preview-wrapper__content {
    margin-top: 16px;
    width: 100%;
    height: 100%;
  }

  .notification-preview-wrapper__iframe {
    width: 100%;
    height: 100%;
  }
`;

const NotificationPreview: React.FC<INotificationPreviewProps> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const {
    notificationTemplate: { contentId }
  } = useSelector(getNotificationState);
  const { isLoading, lang, html } = useSelector(getNotificationPreviewState);
  const languageOptions = useSelector(selectLanguageOptions);

  React.useEffect(() => {
    if (contentId && !html) {
      dispatch(getNotificationPreview({ contentId, lang }));
    }
  }, [dispatch, contentId, lang, html]);

  const handleChangeLang = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const lang = event.target.value;

      if (contentId) {
        dispatch(getNotificationPreview({ contentId, lang }));
      }
    },
    [dispatch, contentId]
  );

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
        Notification Preview
      </DrawerHeader>
      <DrawerContent>
        <StyledNotificationPreviewContent>
          <div className="notification-preview-wrapper">
            <div className="notification-preview-wrapper__select">
              <Select onChange={handleChangeLang} value={lang}>
                {languageOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="notification-preview-wrapper__content">
              <iframe
                className="notification-preview-wrapper__iframe"
                srcDoc={html}
                title="preview"
                data-testid="notification-iframe"
              ></iframe>
            </div>
          </div>
        </StyledNotificationPreviewContent>
      </DrawerContent>
    </>
  );
};

export { NotificationPreview };
