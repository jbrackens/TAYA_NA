export const colors = {
  orange: "#ff7a20",
  green: "#00ab11",
  blue: "#3f8cff",
  white: "#fff",
  red: "#f22121",
  red02: "#be0014",
  gray07: "#121212",
  gray02: "#b6b6b6",
  gray08: "#1f1f1f",
  gray06: "#171717",
  gray03: "#8d8d8d",
  gray04: "#CBCBCB",
  gray05: "#252525",
  gray09: "#303030",
  black01: "#1d1d1d",
  black: "#000",
  gray10: "#181818",
  gray11: "#dedede",
  gray12: "#dbdbdb",
  gray13: "#5a5a5a",
  gray14: "#484848",
  gray15: "#555555",
  gray16: "#232323",
  orange02: "#e35419",
  orange03: "#e9601a",
  green02: "#13661b",
  gray17: "#434343",
};

type Theme = {
  deviceWidth: {
    small: string;
    medium: string;
    large: string;
  };
  layout: {
    listBackground: string;
    borderColor: string;
    scrollbarColor: string;
    scrollbarHoverColor: string;
  };
  header: {
    font: string;
    fontSelected: string;
    background: string;
  };
  mainSider: {
    background: string;
    font: string;
    selected: string;
    collapseButton: {
      background: string;
      icon: string;
    };
    submenu: {
      font: string;
    };
  };
  content: {
    background: string;
    mainFont: string;
    title: string;
    subtitle: string;
    containerBackground: string;
    divider: string;
    section: {
      titleHightLighted: string;
      title: string;
    };
  };
  list: {
    title: string;
    element: {
      background: string;
      selectedBackground: string;
      font: string;
      active: string;
      activeShadow: string;
      inactive: string;
      inactiveShadow: string;
    };
  };
  listSider: {
    addBackground: string;
    customMessageFont: string;
  };
  login: {
    background: string;
  };
  deleteModal: {
    errorTextColor: string;
  };
  settings: {
    backgroundColor: string;
    coloredInfo: string;
  };
  wallet: {
    positive: string;
    negative: string;
  };
  uiComponents: {
    general: {
      hoverBorderColor: string;
    };
    button: {
      defaultColor: string;
      defaultBackgroundColor: string;
      defaultBackgroundHoverColor: string;
      primaryColor: string;
      secondaryColor: string;
      dangerColor: string;
      denagerColorBackground: string;
      denagerColorBackgroundActive: string;
      coloredColor: string;
      hoverColor: string;
      selectColor: string;
      selectFontColor: string;
      disableColor: string;
      disabledFont: string;
      blueOutlineColor: string;
      blueOutlineBorderColor: string;
      whiteOutlineColor: string;
      whiteOutlineBorderColor: string;
      whiteOutlineBorderColorHover: string;
    };
    input: {
      background: string;
      darkBackground: string;
      fontColor: string;
      labelColor: string;
      errorColor: string;
      iconBackground: string;
    };
    header: {
      primaryColor: string;
      secondaryColor: string;
    };
    link: {
      fontColor: string;
    };
    mainList: {
      listItemBackground: string;
      listItemBackgroundSelected: string;
      outline: string;
      positive: string;
      negative: string;
      positiveShadow: string;
      fontColor: string;
    };
    select: {
      backColor: string;
      hoverColor: string;
      fontColor: string;
      label: string;
      keyDown: string;
    };
    toggle: {
      colorChecked: string;
      colorUnchecked: string;
      switchColor: string;
      disabled: string;
    };
    modal: {
      blackBackground: string;
      modalBackground: string;
      closeButtonColor: string;
    };
    radio: {
      background: string;
      border: string;
      selectedColor: string;
      font: string;
      dot: string;
      labelColor: string;
    };
    checkbox: {
      border: string;
      selectedColor: string;
      hoverColor: string;
      checkboxTextColor: string;
    };
    table: {
      rowBackgroundColor: string;
      fontColor: string;
      borderColor: string;
      headerBackgroundColor: string;
      headerFontColor: string;
      headerHighlighted: string;
      strippedColor1: string;
      strippedColor2: string;
    };
    calender: {
      containerBackground: string;
      borderColor: string;
      fontColor: string;
      fontColorDark: string;
      hoverColor: string;
      selectColor: string;
    };
    datePicker: {
      containerBackground: string;
      borderColor: string;
      selectedColor: string;
      fontColor: string;
      hoverColor: string;
    };
    tabs: {
      tabBottomBorder: string;
      tabColor: string;
      tabColorSelect: string;
      hoverColor: string;
      selectBorder: string;
    };
    loader: {
      backColor: string;
    };
    pagination: {
      selectedColor: string;
      normalColor: string;
      textColor: string;
    };
    result: {
      iconColor: string;
    };
    transfer: {
      background: string;
      border: string;
      activeButtonColor: string;
      disabledButtonColor: string;
    };
    display: {
      displayBackground: string;
    };
  };
};

export const theme: Theme = {
  deviceWidth: {
    small: "425px",
    medium: "768px",
    large: "1440px",
  },
  layout: {
    listBackground: colors.gray07,
    borderColor: colors.gray08,
    scrollbarColor: colors.gray09,
    scrollbarHoverColor: colors.gray15,
  },
  header: {
    font: colors.gray03,
    fontSelected: colors.white,
    background: colors.gray10,
  },
  mainSider: {
    background: colors.black,
    font: colors.gray03,
    selected: `linear-gradient(to right, ${colors.red02} 5%, ${colors.orange03} 100%)`,
    collapseButton: {
      background: colors.gray05,
      icon: colors.gray03,
    },
    submenu: {
      font: colors.orange,
    },
  },
  content: {
    background: colors.gray10,
    mainFont: colors.gray04,
    title: colors.gray04,
    subtitle: colors.gray02,
    containerBackground: colors.black01,
    divider: colors.gray05,
    section: {
      title: colors.gray03,
      titleHightLighted: colors.orange,
    },
  },
  list: {
    title: colors.orange,
    element: {
      background: colors.gray07,
      selectedBackground: colors.gray05,
      font: colors.white,
      active: colors.green,
      activeShadow: colors.green02,
      inactive: colors.red,
      inactiveShadow: colors.red,
    },
  },
  listSider: {
    addBackground: colors.black,
    customMessageFont: colors.gray13,
  },
  login: {
    background: colors.black01,
  },
  deleteModal: {
    errorTextColor: colors.red,
  },
  settings: {
    backgroundColor: colors.black01,
    coloredInfo: colors.orange,
  },
  wallet: {
    positive: colors.green,
    negative: colors.red,
  },
  uiComponents: {
    general: {
      hoverBorderColor: colors.blue,
    },
    button: {
      defaultColor: colors.white,
      defaultBackgroundColor: colors.gray05,
      defaultBackgroundHoverColor: colors.gray09,
      primaryColor: colors.green,
      secondaryColor: "transparent",
      dangerColor: colors.red,
      denagerColorBackground: "rgba(242, 33, 33, 0.5)",
      denagerColorBackgroundActive: "rgba(242, 33, 33, 0.7)",
      coloredColor: `linear-gradient(to right, ${colors.red02} 5%, ${colors.orange03} 100%)`,
      hoverColor: "rgba(0, 171, 17, 0.7)",
      selectColor: "rgba(0, 171, 17, 0.5)",
      selectFontColor: colors.gray11,
      disableColor: colors.gray05,
      disabledFont: colors.gray03,
      blueOutlineColor: "rgba(63, 140, 255, 0.4)",
      blueOutlineBorderColor: "#3f8cff",
      whiteOutlineColor: colors.black01,
      whiteOutlineBorderColor: colors.gray03,
      whiteOutlineBorderColorHover: colors.white,
    },
    input: {
      background: colors.gray07,
      darkBackground: colors.black,
      fontColor: colors.white,
      labelColor: colors.gray03,
      errorColor: colors.red,
      iconBackground: colors.black01,
    },
    header: {
      primaryColor: colors.white,
      secondaryColor: colors.orange02,
    },
    link: {
      fontColor: colors.white,
    },
    mainList: {
      listItemBackground: colors.gray06,
      listItemBackgroundSelected: colors.gray05,
      outline: colors.blue,
      positive: colors.green,
      negative: colors.red,
      positiveShadow: colors.green02,
      fontColor: colors.white,
    },
    select: {
      backColor: colors.gray05,
      hoverColor: colors.black01,
      fontColor: colors.white,
      label: colors.gray03,
      keyDown: colors.gray13,
    },
    toggle: {
      colorChecked: colors.green,
      colorUnchecked: colors.gray03,
      switchColor: colors.white,
      disabled: colors.gray02,
    },
    modal: {
      blackBackground: "rgba(0, 0, 0, 0.6)",
      modalBackground: colors.black01,
      closeButtonColor: colors.gray12,
    },
    radio: {
      background: colors.gray05,
      border: colors.gray05,
      selectedColor: colors.green,
      dot: colors.green,
      font: colors.gray02,
      labelColor: colors.gray03,
    },
    checkbox: {
      border: colors.gray03,
      selectedColor: colors.green,
      hoverColor: colors.green02,
      checkboxTextColor: colors.white,
    },
    table: {
      rowBackgroundColor: colors.gray10,
      fontColor: colors.white,
      borderColor: colors.gray05,
      headerBackgroundColor: colors.gray10,
      headerFontColor: colors.gray03,
      headerHighlighted: colors.orange,
      strippedColor1: colors.black01,
      strippedColor2: colors.gray05,
    },
    calender: {
      containerBackground: colors.gray05,
      borderColor: colors.gray09,
      fontColor: colors.gray12,
      fontColorDark: colors.gray13,
      hoverColor: colors.black01,
      selectColor: colors.green,
    },
    datePicker: {
      containerBackground: colors.gray05,
      borderColor: colors.gray09,
      selectedColor: colors.green,
      fontColor: colors.gray12,
      hoverColor: colors.gray07,
    },
    tabs: {
      tabBottomBorder: colors.gray05,
      tabColor: colors.gray03,
      tabColorSelect: colors.white,
      hoverColor: colors.gray07,
      selectBorder: `linear-gradient(to right, ${colors.red02}, ${colors.orange03})`,
    },
    loader: {
      backColor: `linear-gradient(to right, ${colors.gray05}, ${colors.gray14}, ${colors.gray05})`,
    },
    pagination: {
      selectedColor: colors.green,
      normalColor: colors.gray07,
      textColor: colors.white,
    },
    result: {
      iconColor: colors.gray13,
    },
    transfer: {
      background: colors.gray06,
      border: colors.gray17,
      activeButtonColor: colors.blue,
      disabledButtonColor: colors.gray03,
    },
    display: {
      displayBackground: colors.gray16,
    },
  },
};
