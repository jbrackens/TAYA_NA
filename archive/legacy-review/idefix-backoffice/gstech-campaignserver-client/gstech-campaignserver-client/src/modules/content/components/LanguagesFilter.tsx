import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";

import { Dropdown, Button, Popup, Tabs, Tab, MenuItem, Checkbox } from "../../../components";
import { Filter } from "../../../icons";
import { selectLanguageOptions } from "../../app";

const StyledLanguagesFilter = styled(Dropdown)`
  .popup {
    min-width: 132px;
    text-align: center;
    &__isFilled {
      margin-bottom: 10px;
      background: ${({ theme }) => theme.palette.whiteLight};
      color: ${({ theme }) => theme.palette.whiteDark};
    }
    &__language {
      flex-direction: row-reverse;
      justify-content: flex-end;
      & > label {
        margin-right: 10px;
      }
    }
  }
`;

interface Props {
  isLanguagesFilled: boolean;
  filteredLanguages: string[];
  onAddLanguageFilter: (language: string) => void;
  onChangeIsLanguagesFilled: (isLanguage: string | number | string[] | boolean) => void;
}

const LanguagesFilter: React.FC<Props> = ({
  isLanguagesFilled,
  filteredLanguages,
  onAddLanguageFilter,
  onChangeIsLanguagesFilled
}) => {
  const languageOptions = useSelector(selectLanguageOptions);
  return (
    <StyledLanguagesFilter
      button={
        <Button icon={<Filter />} appearance="flat">
          Language
        </Button>
      }
      autoClose={false}
    >
      <Popup className="popup">
        <Tabs className="popup__isFilled" value={isLanguagesFilled} onChange={onChangeIsLanguagesFilled}>
          <Tab value={true}>is</Tab>
          <Tab value={false}>not</Tab>
        </Tabs>
        {languageOptions.map(({ label, value }) => (
          <MenuItem
            className="popup__language"
            key={label}
            icon={<Checkbox checked={filteredLanguages.includes(value)} onClick={e => e.stopPropagation()} readOnly />}
            value={label}
            onClick={() => onAddLanguageFilter(value)}
            disabled={false}
          >
            {label}
          </MenuItem>
        ))}
      </Popup>
    </StyledLanguagesFilter>
  );
};

export { LanguagesFilter };
