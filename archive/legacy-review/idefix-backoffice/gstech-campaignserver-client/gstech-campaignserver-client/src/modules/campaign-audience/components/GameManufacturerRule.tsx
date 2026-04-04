import * as React from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux";

import { Select } from "../../../components";
import { IFormValues } from "../types";
import { useSelector } from "react-redux";
import { fetchGameManufacturers, selectGameManufacturers } from "../../../pages/Games";
import { AppDispatch } from "../../../redux";

const StyledGameManufacturer = styled.div`
  display: flex;
  align-items: center;
`;

interface Props {
  countries: {
    label: string;
    value: string | number;
  }[];
  values: IFormValues;
  setValues: (values: IFormValues, shouldValidate?: boolean) => void;
  disabled?: boolean;
}

const GameManufacturerRule: React.FC<Props> = ({ countries, values, setValues, disabled }) => {
  const dispatch: AppDispatch = useDispatch();
  const [country, setCountry] = React.useState("");
  const gameManufacturers = useSelector(selectGameManufacturers);

  const handleChangeCountry = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setCountry(event.target.value);
  }, []);

  const handleChangeManufacturer = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setValues({ ...values, values: event.target.value });
    },
    [setValues, values]
  );

  React.useEffect(() => {
    dispatch(fetchGameManufacturers({ countryId: country ? country : undefined }));
  }, [country, dispatch]);

  return (
    <StyledGameManufacturer>
      <Select
        name="values"
        placeholder="Select country"
        disabled={disabled}
        onChange={handleChangeCountry}
        value={country}
      >
        <option value="">Select country</option>
        {countries.map(country => (
          <option key={country.value} value={country.value}>
            {country.label}
          </option>
        ))}
      </Select>
      <span className="campaign-rule__separator" />
      <Select
        name="value"
        placeholder="Select manufacturer"
        disabled={disabled}
        onChange={handleChangeManufacturer}
        value={values.values}
      >
        <option value="">Select manufacturer</option>
        {gameManufacturers.map(manufacturer => (
          <option key={manufacturer.id} value={manufacturer.id}>
            {manufacturer.name}
          </option>
        ))}
      </Select>
    </StyledGameManufacturer>
  );
};

export default GameManufacturerRule;
