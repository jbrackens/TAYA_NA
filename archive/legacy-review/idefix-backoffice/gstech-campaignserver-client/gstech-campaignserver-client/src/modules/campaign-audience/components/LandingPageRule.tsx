import * as React from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import { Tab, Tabs } from "../../../components";
import { SelectField } from "../../../fields";
import { AppDispatch } from "../../../redux";
import { CONTENT_TYPES } from "../../../utils/constants";
import { fetchContent } from "../../content";
import { IFormValues } from "../types";

interface Params {
  brandId: string;
}
interface Option {
  value: string | number;
  label: string;
}

interface IProps {
  options: Option[];
  values: IFormValues;
  disabled?: boolean;
  setValues: (values: any, shouldValidate?: boolean) => void;
}

const LandingPageRule: React.FC<IProps> = ({ values, setValues, options, disabled }) => {
  const dispatch: AppDispatch = useDispatch();
  const contentType = CONTENT_TYPES.landingPage;
  const { brandId } = useParams<Params>();

  const handleChangeOperator = React.useCallback(
    (newValue: string | number | string[] | boolean) => {
      setValues({ ...values, operator: newValue });
    },
    [values, setValues]
  );

  React.useEffect(() => {
    if (brandId) dispatch(fetchContent({ brandId, contentType }));
  }, [dispatch, contentType, brandId]);

  return (
    <>
      <Tabs value={values.operator} onChange={handleChangeOperator} disabled={disabled}>
        <Tab value="=">equal to</Tab>
      </Tabs>
      <span className="campaign-rule__separator" />
      <SelectField options={options} name="values" placeholder="Add landing page" disabled={disabled} isMulti={false} />
    </>
  );
};
export default LandingPageRule;
