import * as React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import capitalize from "lodash/capitalize";
import { RewardRuleConfig } from "app/types";
import { Form } from "formik";

import {
  TextInput,
  Select,
  Card,
  CardHeader,
  CardContent,
  SearchCard,
  PreviewCardContent,
  Tab,
  Checkbox
} from "../../components";
import { FormikField, TabsField } from "../../fields";
import { Remove } from "../../icons";
import { fetchRewards, selectAllRewards } from "../rewards";
import { selectRewardRuleTriggers, selectRewardTypesByBrandWithHidden } from "../app";
import { IRewardRuleFormValues } from "./types";
import { AppDispatch, RootState } from "../../redux";

const StyleRewardRuleForm = styled(Form)`
  p:first-child {
    color: ${({ theme }) => theme.palette.blackDark};
  }

  .block-column {
    flex-direction: column;
  }

  .reward-rule-form {
    &__titles {
      margin-top: 32px;

      > div {
        margin-top: 8px;
      }
    }

    &__header-block {
      display: flex;
      justify-content: space-between;
    }

    &__header-option {
      display: flex;
      align-items: center;

      > p {
        margin-right: 5px;
      }
    }

    &__block {
      display: flex;
      margin-top: 32px;
    }

    &__title-block {
      display: flex;
      align-items: center;

      > div:first-child {
        flex-grow: 1;
        margin-right: 5px;
      }
    }

    &__field {
      display: inline-flex;
      flex-direction: column;
      white-space: nowrap;
      color: ${({ theme }) => theme.palette.blackDark};
      &:not(:first-child) {
        margin-left: 16px;
      }
    }

    &__select,
    &__tabs {
      min-width: max-content;
      margin-top: 8px;
    }

    &__deposit-optional {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }

    &__deposit-range {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    &__deposit-range-input {
      width: 56px;
    }

    &__deposit-range-between {
      margin: 0 8px;
    }

    &__wager-input {
      width: 208px;
      margin-top: 8px;
    }

    &__search {
      margin-top: 8px;
    }

    &__reward-card {
      margin-top: 8px;
      width: auto;
    }

    &__reward-card-remove {
      fill: ${({ theme }) => theme.palette.blackMiddle};
      &:hover {
        cursor: pointer;
        fill: ${({ theme }) => theme.palette.blackDark};
      }
    }
  }
`;

interface AddRewardRuleProps {
  values: IRewardRuleFormValues;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

interface Params {
  brandId: string;
}

const RewardRuleForm: React.FC<AddRewardRuleProps> = ({ values, setFieldValue }) => {
  const dispatch: AppDispatch = useDispatch();
  const { brandId } = useParams<Params>();
  const rewards = useSelector(selectAllRewards);
  const triggerOptions = useSelector(selectRewardRuleTriggers);

  const rewardTypesByBrand = useSelector((state: RootState) => selectRewardTypesByBrandWithHidden(state, brandId));

  const [rewardType, setRewardType] = React.useState<string>(
    values.reward?.rewardType ? values.reward?.rewardType : rewardTypesByBrand[0].type
  );
  const allRequiredCheck = React.useCallback(
    titles => Object.values(titles).every(({ required }: any) => required),
    []
  );
  const [allRequired, setAllRequired] = React.useState<boolean>(allRequiredCheck(values.titles));
  const handleMarkRequired = () => {
    const checked = allRequiredCheck(values.titles);
    setAllRequired(!checked);
    Object.keys(values.titles).forEach(lang => setFieldValue(`titles.${lang}.required`, !checked));
  };

  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const handleSearch = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.currentTarget.value),
    []
  );

  const isOnlyOneOption = rewards.length === 1;

  React.useEffect(() => {
    if (brandId) {
      dispatch(fetchRewards({ brandId, rewardType }));
    }
  }, [dispatch, brandId, rewardType]);

  React.useEffect(() => {
    isOnlyOneOption ? setFieldValue("reward", rewards[0]) : setFieldValue("reward", values.reward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewards, isOnlyOneOption, rewardType, setFieldValue]);

  const handleSearchItemClick = React.useCallback(
    (searchItem: RewardRuleConfig, onClose: () => void) => {
      setFieldValue("reward", searchItem);
      setSearchQuery("");
      onClose();
    },
    [setFieldValue]
  );

  const handleChangeRewardType = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setRewardType(event.currentTarget.value),
    []
  );

  const handleRemoveCard = React.useCallback(() => setFieldValue("reward", undefined), [setFieldValue]);

  const searchBy = React.useMemo(() => ["id", "externalId", "description"], []);

  return (
    <StyleRewardRuleForm>
      <div>
        <div className="reward-rule-form__field">
          <span className="text-main-reg">Trigger*</span>
          <FormikField name="trigger">
            <Select className="reward-rule-form__select">
              {triggerOptions.map(option => (
                <option value={option} key={option}>
                  {capitalize(option)}
                </option>
              ))}
            </Select>
          </FormikField>
        </div>
        <div className="reward-rule-form__field">
          <span className="text-main-reg">Use when credited</span>
          <TabsField name="useOnCredit" disabled={false} className="reward-rule-form__tabs">
            <Tab value={true}>True</Tab>
            <Tab value={false}>False</Tab>
          </TabsField>
        </div>
        {values.trigger === "deposit" && (
          <div data-testid="deposit-range" className="reward-rule-form__field">
            <div className="text-main-reg">
              <span>Deposit*</span>
            </div>
            <div className="reward-rule-form__deposit-range">
              <FormikField name="minDeposit">
                <TextInput className="reward-rule-form__deposit-range-input" type="number" placeholder="MIN" />
              </FormikField>
              <span className="reward-rule-form__deposit-range-between">-</span>
              <FormikField name="maxDeposit">
                <TextInput className="reward-rule-form__deposit-range-input" type="number" placeholder="MAX" />
              </FormikField>
            </div>
          </div>
        )}
      </div>
      {values.trigger === "deposit" && (
        <div className="reward-rule-form__titles">
          <div className="reward-rule-form__header-block">
            <p className="text-main-reg">Reward Title</p>
            <div className="reward-rule-form__header-option">
              <p className="text-main-reg">Mark required</p>
              <Checkbox checked={allRequired} onChange={handleMarkRequired} />
            </div>
          </div>
          {Object.keys(values.titles).map(language => (
            <div className="reward-rule-form__title-block" key={language}>
              <FormikField name={`titles.${language}.text`}>
                <TextInput placeholder="Empty" inputAdornment={language.toUpperCase()} />
              </FormikField>
              <Checkbox
                checked={values.titles[language].required}
                onChange={() => setFieldValue(`titles.${language}.required`, !values.titles[language].required)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="reward-rule-form__block">
        <div className="reward-rule-form__field">
          <span className="text-main-reg">Number of rewards credited*</span>
          <FormikField name="quantity">
            <TextInput className="reward-rule-form__wager-input" type="number" placeholder="Rewards credited" />
          </FormikField>
        </div>
        {values.trigger === "deposit" && (
          <div className="reward-rule-form__field">
            <span className="text-main-reg">Wagering requirement*</span>
            <FormikField name="wager">
              <TextInput className="reward-rule-form__wager-input" type="number" placeholder="Wagering" />
            </FormikField>
          </div>
        )}
      </div>

      <div className="reward-rule-form__block">
        <div className="reward-rule-form__field">
          <span className="text-main-reg">Type</span>

          <Select
            className="reward-rule-form__select"
            data-testid="type-select"
            value={rewardType}
            onChange={handleChangeRewardType}
          >
            {rewardTypesByBrand.map(({ name, type }) => (
              <option value={type} key={type}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="reward-rule-form__block block-column">
        <h2 className="text-header">Select reward to be credited</h2>

        {!isOnlyOneOption && (
          <SearchCard
            data={rewards}
            searchQuery={searchQuery}
            searchBy={searchBy}
            className="reward-rule-form__search"
            onChange={handleSearch}
          >
            {(searchItem, onClose) => (
              <Card
                className="reward-rule-form__results-card"
                appearance="flat"
                key={`${searchItem.id}-${searchItem.description}`}
                onClick={() => handleSearchItemClick(searchItem, onClose)}
              >
                <CardHeader>{searchItem.externalId}</CardHeader>
                <CardContent>
                  <PreviewCardContent info={searchItem.description} />
                </CardContent>
              </Card>
            )}
          </SearchCard>
        )}
        {values.reward?.id && (
          <Card className="reward-rule-form__reward-card" appearance="flat">
            <CardHeader
              action={
                !isOnlyOneOption && (
                  <Remove className="reward-rule-form__reward-card-remove" onClick={handleRemoveCard} />
                )
              }
            >
              {values.reward.externalId}
            </CardHeader>
            <CardContent>{values.reward.description}</CardContent>
          </Card>
        )}
      </div>
    </StyleRewardRuleForm>
  );
};

export { RewardRuleForm };
