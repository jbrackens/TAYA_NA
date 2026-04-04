import { FC } from "react";
import { TransferCheckboxHeader } from "./../transferCheckboxheader";
import { Checkbox } from "../..";
import {
  CheckboxWrapper,
  CheckboxContainer,
  CheckboxOuter,
  LoadingDiv,
} from "./../index.styled";
import { LoaderInline } from "./../..";

type CheckboxComponentProps = {
  data: Array<Object>;
  checkboxClicked: (a: any) => void;
  checkCount: number;
  headerDropdownHandler: (type: string) => void;
  label?: string;
  loading?: boolean;
};
type fieldDetailsKey = {
  key?: string;
  value?: string;
  checked?: boolean;
};

export const CheckboxComponent: FC<CheckboxComponentProps> = ({
  data,
  checkboxClicked,
  checkCount,
  headerDropdownHandler,
  label,
  loading,
}) => {
  const generateFields = () => {
    return (
      data &&
      data.map((fieldDetails: fieldDetailsKey, index: number) => (
        <CheckboxOuter
          key={`${fieldDetails.key}-${index}`}
          $selected={fieldDetails.checked ? true : false}
        >
          <Checkbox
            key={`${fieldDetails.key}-${index}`}
            name={fieldDetails.key}
            label={fieldDetails.value}
            checked={fieldDetails.checked}
            onChange={checkboxClicked}
          />
        </CheckboxOuter>
      ))
    );
  };
  const loadingComponent = (
    <LoadingDiv>
      <LoaderInline />
    </LoadingDiv>
  );
  return (
    <CheckboxWrapper>
      <TransferCheckboxHeader
        listLength={data?.length}
        selectedLength={checkCount}
        headerDropdownHandler={headerDropdownHandler}
        label={label}
        loading={loading}
      />
      <CheckboxContainer>
        {loading ? loadingComponent : generateFields()}
      </CheckboxContainer>
    </CheckboxWrapper>
  );
};
