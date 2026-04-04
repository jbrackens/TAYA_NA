import * as React from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Form } from "formik";
import styled from "styled-components";
import capitalize from "lodash/capitalize";
import map from "lodash/map";
import get from "lodash/get";

import { FormikField, SelectField, TabsField } from "../../fields";
import { TextInput, Select, TextArea, Tab } from "../../components";
import { CREDIT_TYPES, getPattern } from "./utils";
import { IRewardFormValues, RewardFormFieldsInfo, RewardFormFieldInfo, RewardFormGamesSelectOption } from "./types";
import { RootState } from "../../redux";
import { hideBrokenImage } from "../../utils/hideBrokenImage";
import { selectRewardFormFieldsInfoByBrandAndType } from "../../modules/app";

const StyledRewardForm = styled(Form)`
  .add-reward {
    &__block {
      display: flex;
      &:not(:first-child) {
        margin-top: 32px;
      }
      &:last-child {
        margin-bottom: 32px;
      }
    }
    &__field {
      display: inline-flex;
      flex: 1;
      flex-direction: column;
      white-space: nowrap;
      color: ${({ theme }) => theme.palette.blackDark};
      &:not(:first-child) {
        margin-left: 16px;
      }

      & > span {
        margin-bottom: 8px;
      }
      &.--boolean {
        flex: unset;
      }
    }
    &__game-preview {
      height: auto;
      max-width: 100%;
    }
    &__preview {
      margin-bottom: 8px;
    }
  }
`;
interface Params {
  brandId: string;
}

interface Props {
  values: IRewardFormValues;
  spinTypes: string[];
  gameList: RewardFormGamesSelectOption[];
}
const RewardForm: React.FC<Props> = ({ values, spinTypes, gameList }) => {
  const { brandId } = useParams<Params>();
  const permalinkPreview = gameList.find(({ value }) => values.gameId === value)?.permalink;

  const formFieldsInfo = useSelector((state: RootState) => selectRewardFormFieldsInfoByBrandAndType(state, brandId));

  const {
    externalId,
    creditType,
    game,
    bonusCode,
    cost,
    spinType,
    spinValue,
    spins,
    description,
    active,
    ...restFields
  } = formFieldsInfo as RewardFormFieldsInfo;

  return (
    <StyledRewardForm>
      <div className="add-reward__block">
        <div className="add-reward__field">
          <span className="text-main-reg">{externalId.title}*</span>
          <FormikField name={externalId.property}>
            <TextInput placeholder="Enter" />
          </FormikField>
        </div>

        <div className="add-reward__field">
          <span className="text-main-reg">{creditType.title}*</span>
          <FormikField name={creditType.property}>
            <Select className="add-reward__select">
              <option value="">Select option</option>
              {CREDIT_TYPES.map(option => (
                <option value={option} key={option}>
                  {capitalize(option)}
                </option>
              ))}
            </Select>
          </FormikField>
        </div>

        <div className="add-reward__field">
          <span className="text-main-reg">{active.title}</span>
          <TabsField name={active.property}>
            <Tab value={true}>True</Tab>
            <Tab value={false}>False</Tab>
          </TabsField>
        </div>
      </div>
      {values.creditType === "freeSpins" && (
        <div className="add-reward__block">
          <div className="add-reward__field">
            <span className="text-main-reg">{game.title}</span>
            {game.preview && permalinkPreview && (
              <img
                className="add-reward__game-preview"
                src={game.preview.replace("{value}", permalinkPreview)}
                onError={hideBrokenImage}
                alt="preview"
              />
            )}
            <SelectField
              className="add-reward__select text-main-reg"
              options={gameList}
              name="gameId"
              placeholder="Enter"
              isMulti={false}
            />
          </div>
        </div>
      )}
      <div className="add-reward__block">
        <div className="add-reward__field ">
          <span className="text-main-reg">{bonusCode.title}*</span>
          <FormikField name={bonusCode.property}>
            <TextInput placeholder="Enter" />
          </FormikField>
        </div>
      </div>
      <div className="add-reward__block">
        <div className="add-reward__field">
          <span className="text-main-reg">{cost.title}</span>
          <FormikField name={cost.property}>
            <TextInput placeholder="Enter" pattern="^\d*\.?\d{0,2}$" />
          </FormikField>
        </div>
      </div>

      {values.creditType === "freeSpins" && (
        <div className="add-reward__block">
          {spinType && (
            <div className="add-reward__field">
              <span className="text-main-reg">{spinType.title}*</span>
              <FormikField name={spinType.property}>
                <Select className="add-reward__select">
                  <option value="">Select option</option>
                  {spinTypes.map(option => (
                    <option value={option.toLowerCase()} key={option}>
                      {capitalize(option)}
                    </option>
                  ))}
                </Select>
              </FormikField>
            </div>
          )}
          {spins && (
            <div className="add-reward__field">
              <span className="text-main-reg">{spins.title}*</span>
              <FormikField name={spins.property}>
                <TextInput placeholder="Enter" pattern="^[0-9]*$" />
              </FormikField>
            </div>
          )}
        </div>
      )}
      {values.creditType === "freeSpins" && spinValue && (
        <div className="add-reward__block">
          <div className="add-reward__field">
            <span className="text-main-reg">{spinValue.title}*</span>
            <FormikField name={spinValue.property}>
              <TextInput placeholder="Enter" pattern="^[0-9]*$" />
            </FormikField>
          </div>
        </div>
      )}
      {restFields &&
        map(restFields, ({ property, title, options, type, preview }: RewardFormFieldInfo) => {
          const isBoolean = type === "boolean";
          if (isBoolean) {
            return (
              <div className="add-reward__block" key={property}>
                <div className="add-reward__field --boolean">
                  <span className="text-main-reg">{title}</span>
                  <TabsField name={property}>
                    <Tab value={true}>True</Tab>
                    <Tab value={false}>False</Tab>
                  </TabsField>
                </div>
              </div>
            );
          }
          return (
            <div className="add-reward__block" key={property}>
              <div className="add-reward__field">
                <span className="text-main-reg">{title}</span>
                {preview && (
                  <div className="add-reward__preview">
                    <img src={preview.replace("{value}", get(values, property))} alt="preview" />
                  </div>
                )}
                <FormikField name={property}>
                  {options ? (
                    <Select className="add-reward__select">
                      <option value="">Select option</option>
                      {options.map((option: string) => (
                        <option value={option} key={option}>
                          {capitalize(option)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <TextInput placeholder="Enter" pattern={getPattern(type)} />
                  )}
                </FormikField>
              </div>
            </div>
          );
        })}

      <div className="add-reward__block">
        <div className="add-reward__field">
          <span className="text-main-reg">{description.title}*</span>
          <FormikField name={description.property}>
            <TextArea className=" text-main-reg" placeholder="Enter" rows={3} />
          </FormikField>
        </div>
      </div>
    </StyledRewardForm>
  );
};

export { RewardForm };
