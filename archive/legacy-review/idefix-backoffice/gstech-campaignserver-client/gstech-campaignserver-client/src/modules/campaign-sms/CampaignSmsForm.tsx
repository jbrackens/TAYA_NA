import * as React from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux";
import { Form } from "formik";

import {
  PickersWrapper,
  SearchCard,
  Loader,
  Card,
  CardHeader,
  PreviewCardContent,
  CardContent,
  Tab
} from "../../components";
import { DefaultTimePickerField, TabsField } from "../../fields";
import AutoSubmit from "./components/AutoSubmit";
import { setSmsTemplateInfo } from "./campaignSmsSlice";
import { AppDispatch } from "../../redux";

interface IFormSms {
  id: number;
  name: string;
  info: string;
}

const StyledEmailForm = styled(Form)`
  .sms__time-wrapper {
    display: flex;

    & > div:first-child {
      margin-right: 20px;
    }
  }

  .sms__search {
    display: flex;
    align-items: center;
    width: 100%;
    margin-top: 32px;
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

interface ISmsForm {
  isLoading: boolean;
  isEditable: boolean;
  smsOptions: IFormSms[];
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  className?: string;
}

const CampaignSmsForm: React.FC<ISmsForm> = ({ isLoading, isEditable, smsOptions, setFieldValue, className }) => {
  const dispatch: AppDispatch = useDispatch();
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const searchBy = React.useMemo(() => ["name"], []);

  const handleSearch = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.currentTarget.value),
    []
  );

  const handleResultClick = React.useCallback(
    (searchItem: IFormSms, onClose: () => void) => {
      const { id, name, info } = searchItem;
      setFieldValue("contentId", id);
      dispatch(setSmsTemplateInfo({ name, info }));
      setSearchQuery("");
      onClose();
    },
    [setFieldValue, dispatch]
  );

  return (
    <StyledEmailForm className={className}>
      {isEditable && (
        <>
          <div className="sms__time-wrapper">
            <PickersWrapper text="Send time" isOptional={true}>
              <DefaultTimePickerField name="sendingTime" />
            </PickersWrapper>
            <PickersWrapper text="Include users with no-marketing flag" isOptional={true}>
              <TabsField name="sendToAll">
                <Tab value={true}>Yes</Tab>
                <Tab value={false}>No</Tab>
              </TabsField>
            </PickersWrapper>
          </div>
          <div className="sms__search">
            <div className="search-wrapper">
              <SearchCard data={smsOptions} searchQuery={searchQuery} searchBy={searchBy} onChange={handleSearch}>
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
    </StyledEmailForm>
  );
};

export { CampaignSmsForm };
