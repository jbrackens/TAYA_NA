import { createTheme, Theme } from "@material-ui/core/styles";

export const colors = {
  blueDark: "#2D3D6D",
  black: "#1C2029",
  blackDark: "rgba(28, 32, 41, 0.64)",
  blackMiddle: "rgba(28, 32, 41, 0.32)",
  blackLight: "rgba(28, 32, 41, 0.08)",
  dirtyWhite: "#F5F5F5",
  white: "#FFFFFF",
  red: "#F2453D",
  orange: "#FF9800",

  blue: "#4054B2",
  blue50: "#E8EAF6",
  blue100: "#C5CAE9",
  teal: "#009688",
  teal50: "#E0F2F1",
  red10: "#fef1f0",
  orange10: "#fff5e6",
  green: "#009688",
  black21: "#212121",
  black61: "#616161",
  black75: "#757575",
  black9e: "#9E9E9E",
  blackda: "#dadada",
  blackc4: "#c4c4c4",
  blacke0: "#E0E0E0",
  blackf5: "#F5F5F5",
  blackfa: "#FAFAFA",
  blackbd: "#BDBDBD",
  blackee: "#eee",
};

export const typography = {
  //headerDefault
  h1: {
    fontStyle: "normal",
    fontWeight: 900,
    fontSize: "20px",
    lineHeight: "28px",
  },
  //headerSmall
  h2: {
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "16px",
    lineHeight: "24px",
  },
  //defaultRegular
  h3: {
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "16px",
  },
  //defaultMedium
  h4: {
    fontStyle: "normal",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "16px",
  },
  //smallRegular
  h5: {
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "16px",
  },
  // smallMedium
  h6: {
    fontStyle: "normal",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
  },
};

export type Colors = typeof colors;
export type Typography = typeof typography;

export let theme: Theme = createTheme({
  props: {
    MuiButton: {
      variant: "outlined",
    },
    MuiSelect: {
      variant: "outlined",
    },
    MuiMenu: {
      getContentAnchorEl: null,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "right",
      },
      transformOrigin: {
        vertical: "top",
        horizontal: "right",
      },
    },
    MuiTextField: {
      fullWidth: true,
      variant: "outlined",
    },
    MuiCheckbox: {
      disableRipple: true,
    },
    MuiSwipeableDrawer: {
      elevation: 0,
      anchor: "right",
    },
    MuiInputLabel: {
      variant: "outlined",
    },
    MuiFormControl: {
      variant: "outlined",
    },
  },
  palette: {
    secondary: {
      main: colors.blue,
    },
    error: {
      main: colors.red,
    },
    success: {
      main: colors.green,
    },
    info: {
      main: colors.blue,
    },
    warning: {
      main: colors.orange,
    },
    action: {
      active: colors.blue,
      selected: colors.blue50,
      hover: colors.blue50,
    },
    text: {
      primary: colors.black21,
      secondary: colors.black61,
      disabled: colors.black75,
      hint: colors.blackf5,
    },
  },
  overrides: {
    MuiTooltip: {
      tooltip: {
        whiteSpace: "nowrap",
        minWidth: "64px",
        fontSize: "12px",
      },
      tooltipPlacementTop: {
        marginBottom: "8px !important",
      },
      tooltipPlacementBottom: {
        marginTop: "8px !important",
      },
      tooltipPlacementRight: {
        marginLeft: "8px !important",
      },
      tooltipPlacementLeft: {
        marginRight: "8px !important",
      },
    },
    MuiCardContent: {
      root: {
        "&:last-child": {
          paddingBottom: "16px",
        },
      },
    },
    MuiTable: {
      root: {
        display: "flex",
        flexDirection: "column",
      },
    },
    MuiTableBody: {
      root: {
        display: "flex",
        width: "100%",
        height: "100%",
      },
    },
    MuiTableHead: {
      root: {
        display: "flex",
        borderBottom: `2px solid ${colors.blacke0}`,
        transition: " all 0.4s ease-out",
        minHeight: "50px",
        "& .MuiTableCell-root": {
          fontSize: 12,
          lineHeight: "16px",
          overflow: "visible",
          color: colors.black9e,
        },
        "&:hover": {
          borderRadius: "8px 8px 0 0",
          background: colors.blackf5,
        },
      },
    },
    MuiTableRow: {
      root: {
        display: "flex",
        transition: " all 0.4s ease-out",
        borderBottom: `1px solid ${colors.blacke0}`,
        "&:hover": {
          background: colors.blackf5,
        },
      },
    },
    MuiTableCell: {
      root: {
        display: "flex",
        flex: "1 1 auto",
        alignItems: "center",
        width: "100%",
        paddingLeft: 0,
        paddingRight: 0,
        fontSize: 12,
        borderBottom: "none",
        "&:first-child": {
          paddingLeft: 16,
        },
        "&:last-child": {
          paddingRight: 16,
        },
      },
    },
    MuiTableFooter: {
      root: {
        display: "flex",
        transition: " all 0.4s ease-out",
        borderTop: `1px solid ${colors.blacke0}`,
        "& .MuiTableCell-root": {
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 500,
          overflow: "visible",
          color: colors.black21,
        },
        "&:hover": {
          borderRadius: "0 0 8px 8px",
          background: colors.blackf5,
        },
      },
    },
    MuiSelect: {
      selectMenu: {
        display: "flex",
        alignItems: "center",
        height: undefined,
      },
    },
    MuiMenu: {
      paper: {
        marginTop: 8,
        borderRadius: 8,
        minWidth: "108px",
      },
    },
    MuiMenuItem: {
      root: {
        textTransform: "none",
        fontSize: 14,
        lineHeight: "24px",
        color: colors.black21,
        "&:hover": {
          color: colors.blue,
          "& svg": {
            fill: colors.blue,
          },
          "& .MuiSvgIcon-root": {
            color: colors.blue,
          },
        },
      },
    },
    MuiPopover: {
      paper: {
        boxShadow: "0px 1px 3px #00000033, 0px 2px 2px #0000001f, 0px 0px 2px #00000024",
      },
    },
    MuiSvgIcon: {
      fontSizeSmall: {
        fontSize: 16,
        color: "inherit",
      },
    },
    MuiIconButton: {
      root: {
        color: colors.black61,
        borderColor: colors.blackc4,
        "&:hover": {
          color: colors.blue,
          borderColor: colors.blue100,
        },
      },
      colorSecondary: {
        color: colors.blue,
        borderColor: colors.blue100,
      },
    },
    MuiButton: {
      root: {
        border: `1px solid ${colors.blackc4}`,
        "&:hover": {
          color: colors.blue,
          backgroundColor: colors.blue50,
          borderColor: colors.blue100,
        },
        "&$disabled": {
          border: `1px solid ${colors.blacke0}`,
          "& $startIcon": {
            color: colors.blacke0,
          },
          "& $endIcon": {
            color: colors.blacke0,
          },
        },
        "& a": {
          textDecoration: "none",
          color: "inherit",
        },
      },
      outlined: {
        fontSize: 12,
        lineHeight: "16px",
        color: colors.black21,
        whiteSpace: "nowrap",
        height: 32,
        borderRadius: 17,
        "&:hover $startIcon": {
          color: colors.blue,
        },
        "&:hover $endIcon": {
          color: colors.blue,
        },
      },
      outlinedSecondary: {
        color: colors.blue,
        borderColor: colors.blue100,
        "&$disabled": {
          border: `1px solid ${colors.blacke0}`,
        },
        "&:hover": {
          backgroundColor: colors.blue50,
          borderColor: colors.blue100,
        },
        "& $startIcon": {
          color: colors.blue,
        },
        "& $endIcon": {
          color: colors.blue,
        },
      },
      startIcon: {
        color: colors.black61,
      },
      endIcon: {
        color: colors.black61,
      },
    },
    MuiCheckbox: {
      root: {
        color: colors.blackda,
        "& .MuiSvgIcon-root": {
          width: 18,
          height: 18,
        },
        "&:hover": {
          color: colors.blue,
          backgroundColor: colors.blue50,
        },
      },
    },
    MuiFormControl: {
      marginNormal: {
        marginTop: 16,
        marginBottom: 16,
      },
    },
    MuiFormLabel: {
      root: {
        textTransform: "capitalize",
      },
    },
    MuiTextField: {
      root: {
        "& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button": {
          WebkitAppearance: "none",
          margin: 0,
        },
      },
    },
    MuiInputLabel: {
      root: {
        fontSize: 14,
        "&$disabled": {
          color: colors.blackbd,
        },
        "&$error": {
          color: colors.red,
        },
      },
    },
    MuiDialogActions: {
      spacing: {
        padding: "16px 24px",
      },
    },
    MuiInputAdornment: {
      root: {
        color: colors.blackbd,
        "& .MuiSvgIcon-root": {
          width: 16,
          height: 16,
        },
      },
    },
    MuiOutlinedInput: {
      root: {
        fontSize: 14,
        lineHeight: "21px",
        "&:hover:not($disabled):not($focused):not($error) $notchedOutline": {
          borderColor: colors.blue,
        },
        "&$notchedOutline": {
          borderColor: colors.blacke0,
        },
        "&$disabled": {
          color: colors.blackbd,
          borderColor: colors.blacke0,
        },
        "&$focused": {
          borderColor: colors.blue,
          "&:not($disabled):not($error) .MuiInputAdornment-positionStart": {
            color: colors.blue,
          },
        },
        "&$error": {
          color: colors.red,
          borderColor: colors.red,
          "& .MuiInputAdornment-positionStart": {
            color: colors.red,
          },
          "& .MuiSvgIcon-root": {
            color: colors.red,
          },
        },
        "& fieldset": {
          borderColor: colors.blacke0,
        },
      },
      multiline: {
        padding: "16.32px 14px",
      },
    },
    MuiPickersModal: {
      dialogAction: {
        color: colors.blue,
      },
    },
    MuiPickersToolbar: {
      toolbar: {
        padding: 16,
        height: "auto",
        backgroundColor: colors.blue,
      },
    },
    MuiPickersToolbarText: {
      toolbarTxt: {
        "&::after": {
          content: '""',
          position: "absolute",
          top: "47%",
          width: 0,
          height: 0,
          marginLeft: 4,
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "4px solid",
          borderTopColor: "inherit",
        },
      },
    },
    MuiPickersToolbarButton: {
      toolbarBtn: {
        border: "none",
        padding: "6px 20px 6px 8px",
        "&:hover": {
          backgroundColor: "transparent",
        },
      },
    },
    MuiPickersBasePicker: {
      container: {},
      pickerView: {
        minWidth: "auto",
        flexDirection: "column",
        justifyContent: "flex-start",
        minHeight: 268,
        maxHeight: 268,
      },
    },
    MuiPickersYearSelection: {
      container: {
        width: "100%",
        height: "auto",
      },
    },
    MuiPickersMonthSelection: {
      container: {
        width: "100%",
        alignContent: "flex-start",
      },
    },
    MuiPickersMonth: {
      root: {
        height: 64,
      },
      monthDisabled: {
        color: colors.blackbd,
      },
    },
    MuiPickersDay: {
      day: {
        width: 32,
        height: 32,
      },
    },
    MuiPickersCalendarHeader: {
      dayLabel: {
        color: colors.black61,
      },
      switchHeader: {
        margin: 4,
        "& .MuiPickersCalendarHeader-transitionContainer": {
          cursor: "pointer",
          "&:hover": {
            color: colors.blue,
          },
        },
      },
      iconButton: {
        borderRadius: "8%",
        "&:hover": {
          color: colors.blue,
        },
      },
    },
    MuiPickersCalendar: {
      transitionContainer: {
        marginTop: 8,
        minHeight: "100%",
      },
    },
  },
  typography,
  colors,
});
