import * as React from "react";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";

import { getEmailState } from "../";
import { getEmailPreview, getEmailPreviewState } from "./emailPreviewSlice";
import { selectLanguageOptions } from "../../app";
import { Button, DrawerContent, DrawerHeader, Loader, Select } from "../../../components";
import { AppDispatch } from "../../../redux";

interface IEmailPreviewProps {
  onClose: () => void;
}

const StyledEmailPreviewContent = styled.div`
  display: flex;
  justify-content: center;
  width: 432px;
  height: 100%;

  .email-preview-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .email-preview-wrapper__select {
    width: max-content;
  }

  .email-preview-wrapper__content {
    margin-top: 16px;
    width: 100%;
    height: 100%;
  }

  .email-preview-wrapper__iframe {
    width: 100%;
    height: 100%;
  }
`;

const EmailPreview: React.FC<IEmailPreviewProps> = ({ onClose }) => {
  const dispatch: AppDispatch = useDispatch();
  const {
    emailTemplate: { contentId }
  } = useSelector(getEmailState);
  const { isLoading, lang, html } = useSelector(getEmailPreviewState);
  const languageOptions = useSelector(selectLanguageOptions);

  React.useEffect(() => {
    if (contentId && !html) {
      dispatch(getEmailPreview({ contentId, lang }));
    }
  }, [dispatch, contentId, lang, html]);

  const handleChangeLang = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const lang = event.target.value;

      if (contentId) {
        dispatch(getEmailPreview({ contentId, lang }));
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
        Email Preview
      </DrawerHeader>
      <DrawerContent>
        <StyledEmailPreviewContent>
          <div className="email-preview-wrapper">
            <div className="email-preview-wrapper__select">
              <Select onChange={handleChangeLang} value={lang}>
                {languageOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="email-preview-wrapper__content">
              <iframe
                className="email-preview-wrapper__iframe"
                srcDoc={html}
                title="preview"
                data-testid="email-iframe"
              ></iframe>
            </div>
          </div>
        </StyledEmailPreviewContent>
      </DrawerContent>
    </>
  );
};

export { EmailPreview };
