import * as React from "react";
import styled from "styled-components";
import { FieldArray } from "formik";
import { ThumbnailUrls } from "app/types";

import { TextInput, Tab, Select, Button } from "../../components";
import { Delete } from "../../icons";
import { FormikField, SelectField, TabsField, CreatableSelectField } from "../../fields";
import { IFormValues, ThumbnailOption } from "./types";
import { getThumbnailUrlAndText } from "./utils";
import { hideBrokenImage } from "../../utils/hideBrokenImage";

const StyledGameForm = styled.form`
  & > :not(:first-child) {
    margin-top: 32px;
  }

  .game__block {
    display: flex;

    &:not(:first-child) {
      margin-top: 16px;
    }

    & > :not(:first-child) {
      margin-left: 16px;
    }

    &:last-child {
      margin-bottom: 32px;
    }
  }

  .game__field {
    display: inline-flex;
    flex-direction: column;
    flex-grow: 1;
    color: ${({ theme }) => theme.palette.blackDark};

    & > :last-child {
      margin-top: 8px;
    }
  }

  .reset-flex-grow {
    flex-grow: initial;
  }

  .preview-image {
    border-radius: 4px;
  }

  .row {
    display: flex;
    margin-top: 8px;

    & > div {
      flex-grow: 1;
    }

    & > :not(:first-child) {
      margin-left: 16px;
    }

    & > :last-child {
      margin-left: 8px;
    }
  }

  .delete-icon {
    align-self: center;
    fill: ${({ theme }) => theme.palette.blackDark};

    &:hover {
      cursor: pointer;
      fill: ${({ theme }) => theme.palette.black};
    }
  }
`;

interface PermalinkOption {
  value: string;
  label: string;
}

interface Props {
  values: IFormValues;
  thumbnailsOptions: ThumbnailOption[];
  thumbnailsUrls: ThumbnailUrls;
  permalinks: PermalinkOption[];
  viewModes: string[];
}

const gameCategories = ["VideoSlot", "TableGame", "Special", "Live", "ClassicSlot"];

const GameForm: React.FC<Props> = ({
  values: { tags, viewMode, thumbnailId, parameters },
  thumbnailsOptions,
  thumbnailsUrls,
  permalinks,
  viewModes
}) => {
  const { thumbnailUrl, thumbnailAltText } = React.useMemo(
    () =>
      getThumbnailUrlAndText({
        thumbnailsOptions,
        thumbnailsUrls,
        viewMode,
        thumbnailId
      }),
    [thumbnailId, viewMode, thumbnailsUrls, thumbnailsOptions]
  );

  return (
    <StyledGameForm>
      <div className="section">
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Name*</span>
            <FormikField name="name">
              <TextInput placeholder="Enter" />
            </FormikField>
          </div>
        </div>
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Permalink*</span>
            <CreatableSelectField name="permalink" options={permalinks} placeholder="Enter" isMulti={false} />
          </div>
        </div>
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Manufacturer name override</span>
            <FormikField name="manufacturer">
              <TextInput placeholder="Enter" />
            </FormikField>
          </div>
          <div className="game__field reset-flex-grow">
            <span className="text-main-reg">Active*</span>
            <TabsField name="active">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="game__block">
          <div className="game__field reset-flex-grow">
            <span className="text-main-reg">Primary Type*</span>
            <FormikField name="primaryCategory">
              <Select>
                {gameCategories.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </FormikField>
          </div>
        </div>
        <div className="game__block">
          <div className="game__field ">
            <span className="text-main-reg">New*</span>
            <TabsField name="newGame">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
          <div className="game__field">
            <span className="text-main-reg">Jackpot*</span>
            <TabsField name="jackpot">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
          <div className="game__field">
            <span className="text-main-reg">Search Only*</span>
            <TabsField name="searchOnly">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
        </div>
        <div className="game__block">
          <div className="game__field reset-flex-grow">
            <span className="text-main-reg">Promoted</span>
            <TabsField name="promoted">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
          <div className="game__field reset-flex-grow">
            <span className="text-main-reg">Drop & Wins</span>
            <TabsField name="dropAndWins">
              <Tab value={true}>True</Tab>
              <Tab value={false}>False</Tab>
            </TabsField>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Thumbnail</span>
            <CreatableSelectField
              name="thumbnailId"
              options={thumbnailsOptions}
              placeholder="Thumbnail"
              isMulti={false}
            />
          </div>
        </div>
        <div className="game__block reset-flex-grow">
          <div className="game__field">
            <span className="text-main-reg">Aspect Ratio</span>
            <FormikField name="aspectRatio">
              <Select>
                {["16x9", "4:3", "3x2", "wms-wide"].map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormikField>
          </div>
          <div className="game__field">
            <span className="text-main-reg">View Mode</span>
            <FormikField name="viewMode">
              <Select>
                {viewModes.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormikField>
          </div>
        </div>
      </div>

      {thumbnailId && (
        <div className="section">
          <img className="preview-image" src={thumbnailUrl} onError={hideBrokenImage} alt={thumbnailAltText} />
        </div>
      )}

      <div className="section">
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Keywords</span>
            <FormikField name="keywords">
              <TextInput placeholder="Enter" />
            </FormikField>
          </div>
        </div>
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Tags</span>
            <SelectField
              name="tags"
              options={tags.map(value => ({ value, label: value }))}
              isMulti={true}
              creatable={true}
              placeholder="Add Tag"
            />
          </div>
        </div>
      </div>
      <div className="section">
        <div className="game__block">
          <div className="game__field">
            <span className="text-main-reg">Parameters</span>
            <FieldArray name="parameters">
              {arrayHelpers => (
                <>
                  {parameters.map((param, index) => (
                    <div key={index} className="row">
                      <FormikField name={`parameters[${index}].key`}>
                        <TextInput placeholder="Key" />
                      </FormikField>
                      <FormikField name={`parameters[${index}].value`}>
                        <TextInput placeholder="Value" />
                      </FormikField>
                      <Delete className="delete-icon" onClick={() => arrayHelpers.remove(index)} />
                    </div>
                  ))}
                  <Button appearance="flat" type="button" onClick={() => arrayHelpers.push({ key: "", value: "" })}>
                    Add Parameter
                  </Button>
                </>
              )}
            </FieldArray>
          </div>
        </div>
      </div>
    </StyledGameForm>
  );
};

export { GameForm };
