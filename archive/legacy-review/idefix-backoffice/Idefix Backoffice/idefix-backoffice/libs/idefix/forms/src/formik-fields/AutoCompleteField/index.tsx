import React, { FC, SyntheticEvent, useCallback, useState } from "react";
import { getIn, FieldProps } from "formik";
import { VariableSizeList, ListChildComponentProps } from "react-window";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Popper from "@mui/material/Popper";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";

const LISTBOX_PADDING = 8; // px

const renderRow = (props: ListChildComponentProps) => {
  const { data, index, style } = props;
  const dataSet = data[index];
  const inlineStyle = {
    ...style,
    top: (style.top as number) + LISTBOX_PADDING
  };

  return (
    <div style={{ ...inlineStyle, overflow: "auto", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{dataSet}</div>
  );
};

const OuterElementContext = React.createContext({});

const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);

  return <div ref={ref} {...props} {...outerProps} />;
});

const useResetCache = (data: any) => {
  const ref = React.useRef<VariableSizeList>(null);

  React.useEffect(() => {
    if (ref.current != null) {
      ref.current.resetAfterIndex(0, true);
    }
  }, [data]);

  return ref;
};

// Adapter for react-window
const ListboxComponent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement>>(function ListboxComponent(
  props,
  ref
) {
  const { children, ...other } = props;
  const itemData: React.ReactNode[] = [];
  (children as React.ReactNode[]).forEach((item: React.ReactNode) => {
    itemData.push(item);
    // @ts-ignore
    itemData.push(...(item.children || []));
  });

  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"), {
    noSsr: true
  });
  const itemCount = itemData.length;
  const itemSize = smUp ? 36 : 48;

  const getChildSize = (child: React.ReactNode) => {
    // @ts-ignore
    if (child.hasOwnProperty("group")) {
      return 48;
    }

    return itemSize;
  };

  const getHeight = () => {
    if (itemCount > 8) {
      return 8 * itemSize;
    }
    return itemData.map(getChildSize).reduce((a, b) => a + b, 0);
  };

  const gridRef = useResetCache(itemCount);

  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width="100%"
          ref={gridRef}
          outerElementType={OuterElementType}
          innerElementType="ul"
          itemSize={index => getChildSize(itemData[index])}
          overscanCount={5}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});

interface Props extends FieldProps {
  label: string;
  optionsConfig: any;
  options: any;
  isMulti?: boolean;
  [key: string]: unknown;
}

const AutoCompleteField: FC<Props> = ({ label, field, form, optionsConfig, isMulti, ...rest }) => {
  const initialValues = field.value || form.initialValues[field.name] || isMulti ? [] : null;
  const [value, setValue] = useState(initialValues);
  const { touched, errors, setFieldTouched, setFieldValue } = form;
  const fieldError = getIn(errors, field.name);
  const showError = getIn(touched, field.name) && !!fieldError;

  const handleBlur = useCallback(() => {
    setFieldTouched(field.name);
  }, [field.name, setFieldTouched]);

  const handleChangeValue = useCallback(
    (_event: SyntheticEvent<Element, Event>, value: any) => {
      setValue(value);

      if (isMulti) {
        setFieldValue(field.name, value);
      } else {
        setFieldValue(field.name, value?.[optionsConfig.value]);
      }
    },
    [field.name, optionsConfig.value, isMulti, setFieldValue]
  );

  return (
    <>
      <Autocomplete
        value={value ?? isMulti ? [] : null}
        PopperComponent={Popper}
        ListboxComponent={ListboxComponent}
        getOptionLabel={(opt: any) => opt[optionsConfig.text]}
        renderInput={params => <TextField {...params} label={label} />}
        onChange={handleChangeValue}
        onBlur={handleBlur}
        multiple={isMulti}
        {...rest}
      />
      {showError && (
        <Box mt={1} mb={1} color="red">
          {fieldError}
        </Box>
      )}
    </>
  );
};

export { AutoCompleteField };
