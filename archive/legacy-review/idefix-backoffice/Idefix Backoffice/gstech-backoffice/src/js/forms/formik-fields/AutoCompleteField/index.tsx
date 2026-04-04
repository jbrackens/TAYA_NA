import React, { useState } from "react";
import { getIn } from "formik";
import Select from "react-select";
import { FixedSizeList as List } from "react-window";
import { makeStyles, useTheme } from "@material-ui/styles";
import { Theme } from "@material-ui/core/styles";
import { Box, MenuItem, Paper, TextField, Typography } from "@material-ui/core";
import { FieldProps } from "formik/dist/Field";
import { SelectComponentsProps } from "react-select/base";

const useStyles = makeStyles((theme: Theme) => ({
  input: {
    display: "flex",
    padding: 0,
    height: "inherit",
    minWidth: 200,
  },
  valueContainer: {
    display: "flex",
    flexWrap: "wrap",
    flex: 1,
    alignItems: "center",
    padding: "12px 14px",
    overflow: "hidden",
  },
  noOptionsMessage: {
    padding: theme.spacing(1, 2),
  },
  singleValue: {
    fontSize: 16,
  },
  placeholder: {
    position: "absolute",
    left: 16,
    bottom: 14,
    fontSize: 16,
  },
  paper: {
    position: "absolute",
    zIndex: 2,
    marginTop: theme.spacing(1),
    left: 0,
    right: 0,
  },
}));

function Menu(props: SelectComponentsProps) {
  return (
    <Paper square className={props.selectProps.classes.paper} {...props.innerProps}>
      {props.children}
    </Paper>
  );
}

function ValueContainer(props: SelectComponentsProps) {
  return <Box className={props.selectProps.classes.valueContainer}>{props.children}</Box>;
}

function SingleValue(props: SelectComponentsProps) {
  return (
    <Typography className={props.selectProps.classes.singleValue} {...props.innerProps}>
      {props.children}
    </Typography>
  );
}

function Placeholder(props: SelectComponentsProps) {
  const { selectProps, innerProps = {}, children } = props;
  return (
    <Typography color="textSecondary" className={selectProps.classes.placeholder} {...innerProps}>
      {children}
    </Typography>
  );
}

function Option(props: SelectComponentsProps) {
  return (
    <MenuItem
      ref={props.innerRef}
      selected={props.isFocused}
      component="div"
      style={{
        fontWeight: props.isSelected ? 500 : 400,
      }}
      {...props.innerProps}
    >
      {props.children}
    </MenuItem>
  );
}

function inputComponent({ inputRef, ...props }: SelectComponentsProps) {
  // @ts-ignore
  return <Box ref={inputRef} {...props} />;
}

function MenuListItem({ children, style }: SelectComponentsProps) {
  return <Box style={style}>{children}</Box>;
}

function MenuList({ options, children, maxHeight, selectProps }: SelectComponentsProps) {
  const height = 36;
  const initialOffset = options.indexOf(selectProps.inputValue) * height;
  return (
    <List
      width={""}
      height={maxHeight || 0}
      itemCount={options.length}
      itemSize={height}
      initialScrollOffset={initialOffset}
    >
      {({ index, style }) => <MenuListItem style={style}>{children[index]}</MenuListItem>}
    </List>
  );
}

function Control(props: SelectComponentsProps) {
  const {
    children,
    innerProps,
    innerRef,
    selectProps: { classes, TextFieldProps },
  } = props;

  return (
    <TextField
      margin="normal"
      fullWidth
      InputProps={{
        inputComponent,
        inputProps: {
          className: classes.input,
          ref: innerRef,
          children,
          ...innerProps,
        },
      }}
      {...TextFieldProps}
    />
  );
}

function NoOptionsMessage(props: SelectComponentsProps) {
  return (
    <Typography color="textSecondary" className={props.selectProps.classes.noOptionsMessage} {...props.innerProps}>
      {props.children}
    </Typography>
  );
}

const components = {
  Control,
  Menu,
  MenuList,
  NoOptionsMessage,
  Option,
  Placeholder,
  SingleValue,
  ValueContainer,
};

interface AutocompleteProps extends FieldProps {
  label?: string;
  optionsConfig?: any;
  isMulti?: boolean;
}

const AutoCompleteField = ({ label, field, form, optionsConfig, ...rest }: AutocompleteProps) => {
  const classes = useStyles();
  const theme = useTheme() as Theme;
  const initialValues = field.value || form.initialValues[field.name] || null;
  const [value, setValue] = useState(initialValues);
  const { touched, errors, setFieldTouched } = form;
  const fieldError = getIn(errors, field.name);
  const showError = getIn(touched, field.name) && !!fieldError;

  const handleOnBlur = () => {
    setFieldTouched(field.name);
  };

  function handleChangeValue(newValue: string) {
    if (rest?.isMulti) {
      form.setFieldValue(field.name, newValue);
      setValue(newValue);
    } else {
      form.setFieldValue(field.name, newValue[optionsConfig.value]);
      setValue(newValue);
    }
  }

  const selectStyles = {
    input: (base: any) => ({
      ...base,
      color: theme.palette.text.primary,
      "& input": {
        font: "inherit",
      },
    }),
  };

  return (
    <>
      <Select
        classes={classes}
        styles={selectStyles}
        TextFieldProps={{
          label,
          InputLabelProps: {
            shrink: true,
          },
        }}
        components={components}
        value={value}
        onChange={handleChangeValue}
        onBlur={handleOnBlur}
        getOptionValue={opt => opt[optionsConfig.value]}
        getOptionLabel={opt => opt[optionsConfig.text]}
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

export default AutoCompleteField;
