import * as React from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux";
import { Form } from "formik";

import { SearchCard, Loader, Card, CardHeader, CardContent, PreviewCardContent } from "../../components";
import AutoSubmit from "./components/AutoSubmit";
import { setNotificationTemplateInfo } from "./campaignNotificationSlice";
import { AppDispatch } from "../../redux";

interface IFormNotification {
  id: number;
  name: string;
  info: string;
}

const StyledNotificationForm = styled(Form)`
  .notification__search {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .search-wrapper {
    width: 432px;
  }

  .loader-wrapper {
    margin-left: 14px;
    max-width: 20px;
    height: 20px;
  }
`;

interface INotificationForm {
  isLoading: boolean;
  isEditable: boolean;
  notificationsOptions: IFormNotification[];
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  className?: string;
}

const CampaignNotificationForm: React.FC<INotificationForm> = ({
  isLoading,
  isEditable,
  notificationsOptions,
  setFieldValue,
  className
}) => {
  const dispatch: AppDispatch = useDispatch();
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const searchBy = React.useMemo(() => ["name"], []);

  const handleSearch = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.currentTarget.value),
    []
  );

  const handleResultClick = React.useCallback(
    (searchItem: IFormNotification, onClose: () => void) => {
      const { id, name, info } = searchItem;
      setFieldValue("contentId", id);
      dispatch(setNotificationTemplateInfo({ name, info }));
      setSearchQuery("");
      onClose();
    },
    [dispatch, setFieldValue]
  );

  return (
    <StyledNotificationForm className={className}>
      {isEditable && (
        <>
          <div className="notification__search">
            <div className="search-wrapper">
              <SearchCard
                data={notificationsOptions}
                searchQuery={searchQuery}
                searchBy={searchBy}
                onChange={handleSearch}
              >
                {(searchItem, onClose) => (
                  <Card
                    appearance="flat"
                    key={`${searchItem.name}${searchItem.id}`}
                    onClick={() => handleResultClick(searchItem, onClose)}
                  >
                    <CardHeader>{searchItem.name}</CardHeader>
                    <CardContent>
                      <PreviewCardContent info={searchItem.info} />
                    </CardContent>
                  </Card>
                )}
              </SearchCard>
            </div>
            {isLoading && (
              <div className="loader-wrapper">
                <Loader />
              </div>
            )}
          </div>
          <AutoSubmit />
        </>
      )}
    </StyledNotificationForm>
  );
};

export { CampaignNotificationForm };
