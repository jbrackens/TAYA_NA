import { FC, useEffect, useState } from "react";
import { CheckboxComponent } from "./checkboxComponent";
import { TransferButtons } from "./transferButtons";
import { StyledTransfer, InputError } from "./index.styled";
import {
  findIndex,
  filterCheckedFields,
  changeCheckedStatus,
  CheckboxObjectType,
} from "./transferUtils";

type TransferProps = {
  left: Array<CheckboxObjectType>;
  right: Array<CheckboxObjectType>;
  onChange?: (
    nextSourceArray: Array<CheckboxObjectType>,
    nextTargetArray: Array<CheckboxObjectType>,
    direction: string,
    moveKeys: Array<CheckboxObjectType>,
  ) => void;
  onSelectChange?: (
    sourceArray: Array<CheckboxObjectType>,
    targetArray: Array<CheckboxObjectType>,
  ) => void;
  fullWidth?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  loading?: boolean;
  error?: any;
};

export const Transfer: FC<TransferProps> = ({
  left,
  right,
  onChange,
  onSelectChange,
  fullWidth,
  leftLabel = "items",
  rightLabel = "items",
  loading = false,
  error = "",
}) => {
  const [leftData, setLeftData] = useState(left);
  const [rightData, setRightData] = useState(right);
  const [leftCheckCount, setLeftCheckCount] = useState(
    filterCheckedFields(left, true).length,
  );
  const [rightCheckCount, setRightCheckCount] = useState(
    filterCheckedFields(right, true).length,
  );

  useEffect(() => {
    setLeftData(left);
    setRightData(right);
  }, [left, right]);

  useEffect(() => {
    setLeftCheckCount(filterCheckedFields(leftData, true).length);
    setRightCheckCount(filterCheckedFields(rightData, true).length);
  }, [leftData, rightData]);

  const leftCheckboxClicked = (selectedIndex: string) => {
    const indexToChange = findIndex([...leftData], selectedIndex);
    let newArray: Array<CheckboxObjectType> = [...leftData];
    newArray[indexToChange].checked = !newArray[indexToChange].checked;

    setLeftData(newArray);
    onSelectChange &&
      onSelectChange(
        filterCheckedFields(newArray, true),
        filterCheckedFields(rightData, true),
      );
  };

  const rightCheckboxClicked = (selectedIndex: string) => {
    const indexToChange = findIndex([...rightData], selectedIndex);
    let newArray: Array<CheckboxObjectType> = [...rightData];
    newArray[indexToChange].checked = !newArray[indexToChange].checked;
    setRightData(newArray);
    onSelectChange &&
      onSelectChange(
        filterCheckedFields(leftData, true),
        filterCheckedFields(newArray, true),
      );
  };

  const transferButtonClicked = (direction: string) => {
    let newSourceArray: Array<CheckboxObjectType> = [],
      newTargetArray: Array<CheckboxObjectType> = [],
      moveArray: Array<CheckboxObjectType> = [];
    if (direction === "right") {
      moveArray = filterCheckedFields([...leftData], true);
      newSourceArray = filterCheckedFields([...leftData], false);
      newTargetArray = rightData.concat(changeCheckedStatus(moveArray, false));
    } else if (direction === "left") {
      moveArray = filterCheckedFields([...rightData], true);
      newTargetArray = filterCheckedFields([...rightData], false);
      newSourceArray = leftData.concat(changeCheckedStatus(moveArray, false));
    } else {
      newSourceArray = [...leftData];
      newTargetArray = [...rightData];
    }
    setLeftData(newSourceArray);
    setRightData(newTargetArray);
    onChange && onChange(newSourceArray, newTargetArray, direction, moveArray);
  };

  const selectListItemsFromHeader = (
    selectionType: string,
    direction: string,
  ) => {
    let finalStatus = undefined;
    switch (selectionType) {
      case "all-true":
        finalStatus = true;
        break;
      case "all-false":
        finalStatus = false;
        break;
    }
    if (direction === "right") {
      setRightData(changeCheckedStatus([...rightData], finalStatus));
    } else if (direction === "left") {
      setLeftData(changeCheckedStatus([...leftData], finalStatus));
    }
  };

  return (
    <>
      <StyledTransfer $fullWidth={fullWidth ? true : false}>
        <CheckboxComponent
          label={leftLabel}
          data={leftData}
          checkboxClicked={leftCheckboxClicked}
          checkCount={leftCheckCount}
          headerDropdownHandler={(selectionType: string) =>
            selectListItemsFromHeader(selectionType, "left")
          }
          loading={loading}
        />
        <TransferButtons
          buttonClicked={transferButtonClicked}
          disableLeft={loading || leftCheckCount <= 0}
          disableRight={loading || rightCheckCount <= 0}
        />
        <CheckboxComponent
          label={rightLabel}
          data={rightData}
          checkboxClicked={rightCheckboxClicked}
          checkCount={rightCheckCount}
          headerDropdownHandler={(selectionType: string) =>
            selectListItemsFromHeader(selectionType, "right")
          }
          loading={loading}
        />
      </StyledTransfer>
      <InputError $show={error.length > 0}>{error}</InputError>
    </>
  );
};
