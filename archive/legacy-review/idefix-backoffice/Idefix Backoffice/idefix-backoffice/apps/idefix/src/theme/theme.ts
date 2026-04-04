import { createTheme } from "@mui/material/styles";

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
  blackee: "#eee"
};

export const typography = {
  //headerDefault
  h1: {
    fontStyle: "normal",
    fontWeight: 900,
    fontSize: "20px",
    lineHeight: "28px"
  },
  //headerSmall
  h2: {
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "16px",
    lineHeight: "24px"
  },
  //defaultRegular
  h3: {
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "16px"
  },
  //defaultMedium
  h4: {
    fontStyle: "normal",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "16px"
  },
  //smallRegular
  h5: {
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "12px",
    lineHeight: "16px"
  },
  // smallMedium
  h6: {
    fontStyle: "normal",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px"
  }
};

export type Colors = typeof colors;
export type Typography = typeof typography;

const theme = createTheme({
  // palette: {
  //   secondary: {
  //     main: colors.blue
  //   },
  //   error: {
  //     main: colors.red
  //   },
  //   success: {
  //     main: colors.green
  //   },
  //   info: {
  //     main: colors.blue
  //   },
  //   warning: {
  //     main: colors.orange
  //   },
  //   action: {
  //     active: colors.blue,
  //     selected: colors.blue50,
  //     hover: colors.blue50
  //   },
  //   text: {
  //     primary: colors.black21,
  //     secondary: colors.black61,
  //     disabled: colors.black75
  //   }
  // },

  components: {
    MuiButton: {
      defaultProps: {
        variant: "outlined"
      },
      styleOverrides: {
        root: {
          border: `1px solid ${colors.blackc4}`,
          "&:hover": {
            // color: colors.blue,
            // backgroundColor: colors.blue50,
            // borderColor: colors.blue100
          },
          "&$disabled": {
            // border: `1px solid ${colors.blacke0}`,
            "& $startIcon": {
              // color: colors.blacke0
            },
            "& $endIcon": {
              // color: colors.blacke0
            }
          },
          "& a": {
            textDecoration: "none",
            color: "inherit"
          }
        },
        outlined: {
          fontSize: 12,
          lineHeight: "16px",
          // color: colors.black21,
          whiteSpace: "nowrap",
          height: 32,
          borderRadius: 17,
          "&:hover $startIcon": {
            // color: colors.blue
          },
          "&:hover $endIcon": {
            // color: colors.blue
          }
        },
        outlinedSecondary: {
          // color: colors.blue,
          // borderColor: colors.blue100,
          "&$disabled": {
            // border: `1px solid ${colors.blacke0}`
          },
          "&:hover": {
            // backgroundColor: colors.blue50,
            // borderColor: colors.blue100
          },
          "& $startIcon": {
            // color: colors.blue
          },
          "& $endIcon": {
            // color: colors.blue
          }
        },
        startIcon: {
          // color: colors.black61
        },
        endIcon: {
          // color: colors.black61
        }
      }
    },

    MuiSelect: {
      defaultProps: {
        variant: "outlined"
      },
      styleOverrides: {
        select: {
          display: "flex",
          alignItems: "center",
          height: undefined
        }
      }
    },

    MuiMenu: {
      defaultProps: {
        anchorEl: null,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "right"
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "right"
        }
      },
      styleOverrides: {
        paper: {
          marginTop: 8,
          borderRadius: 8,
          minWidth: "108px"
        }
      }
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 14,
          lineHeight: "24px",
          // color: colors.black21,
          "&:hover": {
            // color: colors.blue,
            "& svg": {
              // fill: colors.blue
            },
            "& .MuiSvgIcon-root": {
              // color: colors.blue
            }
          }
        }
      }
    },

    MuiPopover: {
      styleOverrides: {
        paper: {
          boxShadow: "0px 1px 3px #00000033, 0px 2px 2px #0000001f, 0px 0px 2px #00000024"
        }
      }
    },

    MuiSvgIcon: {
      styleOverrides: {
        fontSizeSmall: {
          fontSize: 16,
          color: "inherit"
        }
      }
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          // color: colors.black61,
          // borderColor: colors.blackc4,
          "&:hover": {
            // color: colors.blue,
            // borderColor: colors.blue100
          }
        },
        colorSecondary: {
          // color: colors.blue,
          // borderColor: colors.blue100
        }
      }
    },

    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        variant: "outlined"
      },
      styleOverrides: {
        root: {
          "& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button": {
            WebkitAppearance: "none",
            margin: 0
          }
        }
      }
    },

    MuiCheckbox: {
      defaultProps: {
        disableRipple: true
      },
      styleOverrides: {
        root: {
          // color: colors.blackda,
          "& .MuiSvgIcon-root": {
            width: 18,
            height: 18
          },
          "&:hover": {
            // color: colors.blue,
            // backgroundColor: colors.blue50
          }
        }
      }
    },

    MuiDrawer: {
      defaultProps: {
        elevation: 0,
        anchor: "right"
      }
    },

    MuiInputLabel: {
      defaultProps: {
        variant: "outlined"
      },
      styleOverrides: {
        root: {
          fontSize: 14,
          "&$disabled": {
            // color: colors.blackbd
          },
          "&$error": {
            // color: colors.red
          }
        }
      }
    },

    MuiDialogActions: {
      styleOverrides: {
        spacing: {
          padding: "16px 24px"
        }
      }
    },

    MuiInputAdornment: {
      styleOverrides: {
        root: {
          // color: colors.blackbd,
          "& .MuiSvgIcon-root": {
            width: 16,
            height: 16
          }
        }
      }
    },

    MuiFormControl: {
      defaultProps: {
        variant: "outlined"
      },
      styleOverrides: {
        marginNormal: {
          marginTop: 16,
          marginBottom: 16
        }
      }
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          textTransform: "capitalize"
        }
      }
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: 14,
          lineHeight: "21px",
          "&:hover:not($disabled):not($focused):not($error) $notchedOutline": {
            // borderColor: colors.blue
          },
          "&$notchedOutline": {
            // borderColor: colors.blacke0
          },
          "&$disabled": {
            // color: colors.blackbd,
            // borderColor: colors.blacke0
          },
          "&$focused": {
            // borderColor: colors.blue,
            "&:not($disabled):not($error) .MuiInputAdornment-positionStart": {
              // color: colors.blue
            }
          },
          "&$error": {
            // color: colors.red,
            // borderColor: colors.red,
            "& .MuiInputAdornment-positionStart": {
              // color: colors.red
            },
            "& .MuiSvgIcon-root": {
              // color: colors.red
            }
          },
          "& fieldset": {
            // borderColor: colors.blacke0
          }
        },
        multiline: {
          padding: "16.32px 14px"
        }
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          whiteSpace: "nowrap",
          minWidth: "64px",
          fontSize: "12px"
        },
        tooltipPlacementTop: {
          marginBottom: "8px !important"
        },
        tooltipPlacementBottom: {
          marginTop: "8px !important"
        },
        tooltipPlacementRight: {
          marginLeft: "8px !important"
        },
        tooltipPlacementLeft: {
          marginRight: "8px !important"
        }
      }
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          "&:last-child": {
            paddingBottom: "16px"
          }
        }
      }
    },

    MuiTable: {
      styleOverrides: {
        root: {
          display: "flex",
          flexDirection: "column"
        }
      }
    },

    MuiTableBody: {
      styleOverrides: {
        root: {
          display: "flex",
          width: "100%",
          height: "100%"
        }
      }
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          display: "flex",
          borderBottom: `2px solid ${colors.blacke0}`,
          transition: " all 0.4s ease-out",
          minHeight: "50px",
          "& .MuiTableCell-root": {
            fontSize: 12,
            lineHeight: "16px",
            overflow: "visible"
            // color: colors.black9e
          },
          "&:hover": {
            borderRadius: "8px 8px 0 0"
            // background: colors.blackf5
          }
        }
      }
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          display: "flex",
          transition: " all 0.4s ease-out",
          borderBottom: `1px solid ${colors.blacke0}`,
          "&:hover": {
            // background: colors.blackf5
          }
        }
      }
    },

    MuiTableCell: {
      styleOverrides: {
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
            paddingLeft: 16
          },
          "&:last-child": {
            paddingRight: 16
          }
        }
      }
    },

    MuiTableFooter: {
      styleOverrides: {
        root: {
          display: "flex",
          transition: " all 0.4s ease-out",
          // borderTop: `1px solid ${colors.blacke0}`,
          "& .MuiTableCell-root": {
            fontSize: 12,
            lineHeight: "16px",
            fontWeight: 500,
            overflow: "visible"
            // color: colors.black21
          },
          "&:hover": {
            borderRadius: "0 0 8px 8px"
            // background: colors.blackf5
          }
        }
      }
    }
  }
});

export { theme };
