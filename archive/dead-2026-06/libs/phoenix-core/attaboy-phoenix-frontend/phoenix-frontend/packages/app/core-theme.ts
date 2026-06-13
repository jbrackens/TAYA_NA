export type ThemeType = {
  baseGutter: number;
  spinnerBackgroundColor: string;
  spinnerContainerBackgroundColor: string;
  uiComponents: {
    buttons: {
      primary: {
        backgroundColor: string;
        hoverBackgroundColor: string;
        fontColor: string;
        hoverFontColor: string;
        borderColor: string;
        hoverBorderColor: string;
        disabledBackgroundColor: string;
        disbaledFontColor: string;
        disabledBorderColor: string;
      };
      default: {
        backgroundColor: string;
        hoverBackgroundColor: string;
        fontColor: string;
        hoverFontColor: string;
        borderColor: string;
        hoverBorderColor: string;
        disabledBackgroundColor: string;
        disbaledFontColor: string;
        disabledBorderColor: string;
      };
      danger: {
        backgroundColor: string;
        hoverBackgroundColor: string;
        fontColor: string;
        hoverFontColor: string;
        borderColor: string;
        hoverBorderColor: string;
        disabledBackgroundColor: string;
        disbaledFontColor: string;
        disabledBorderColor: string;
      };
    };
    modals: {
      backgroundColor: string;
      titleColor: string;
      inputColor: string;
      paragraphColor: string;
      primaryButtonBackgroundColor: string;
      primaryButtonColor: string;
      primaryButtonHoverBackgroundColor: string;
      defaultButtonBackgroundColor: string;
      defaultButtonColor: string;
      defaultButtonHoverBackgroundColor: string;
      loginModal: {
        headerBackgroundColor: string;
        headerColor: string;
        signUpButtonBackgroundColor: string;
        signUpButtonColor: string;
        signUpButtonHoverBackgroundColor: string;
      };
      registerModal: {
        loginInfoColor: string;
        backButtonButtonBackgroundColor: string;
        backButtonButtonBackgroundHoverColor: string;
        backButtonColor: string;
        loginButtonBackgroundColor: string;
        loginButtonColor: string;
        loginButtonHoverBackgroundColor: string;
        stepsDividerBackgroundColor: string;
        stepsIconBackgroundColor: string;
        stepsIconColor: string;
        stepsIconActiveBorderColor: string;
        stepsIconActiveColor: string;
        stepsIconActiveBackgroundColor: string;
        stepsIconFinishedBackgroundColor: string;
        stepsIconFinishedColor: string;
        linkColor: string;
        linkHoverColor: string;
      };
      idComplyModal: {
        cancelButtonButtonBackgroundColor: string;
        cancelButtonButtonBackgroundHoverColor: string;
        cancelButtonColor: string;
      };
      infoModal: {
        iconColor: string;
        buttonBackgroundColor: string;
        buttonHoverBackgroudnColor: string;
      };
      errorModal: {
        iconColor: string;
        buttonBackgroundColor: string;
        buttonHoverBackgroudnColor: string;
      };
      warningModal: {
        iconColor: string;
        buttonBackgroundColor: string;
        buttonHoverBackgroudnColor: string;
      };
      geocomplyModal: {
        headerIconBackgroundColor: string;
        downloadButtonBackgroundColor: string;
        downloadButtonHoverBackgroundColor: string;
        downloadButtonBorderColor: string;
        downloadButtonHoverBorderColor: string;
        downloadButtonColor: string;
        downloadButtonHoverColor: string;
        downloadButtonDividerColor: string;
        downloadButtonDividerHoverColor: string;
      };
    };
    input: {
      fontColor: string;
      backgroundColor: string;
      borderColor: string;
      backgroundHoverColor: string;
      borderHoverColor: string;
      errorBackgroundColor: string;
      errorBorderColor: string;
      errorFontColor: string;
    };
    select: {
      fontColor: string;
      backgroundColor: string;
      hoverBackgroundColor: string;
      activeBackgroundColor: string;
      activeIcon: string;
    };
    checkbox: {
      color: string;
      backgroundColor: string;
      tickColor: string;
      borderColor: string;
      hoverBackgroudColor: string;
      checkedBackgroundColor: string;
    };
  };
  menu: {
    userIcon: string;
    mobileUserIcon: string;
    userIconHover: string;
    backgroundColor: string;
    mobileBackgroundColor: string;
    loginButtonBorderColor: string;
    loginMobileButtonBacgroundColor: string;
    loginMobileButtonColor: string;
    loginMobileButtonBorderColor: string;
    signUpButtonBorderColor: string;
    signUpMobileButtonBacgroundColor: string;
    signUpMobileButtonColor: string;
    signUpMobileButtonBorderColor: string;
    active: string;
    activeBorder: string;
    activeHover: string;
    inactiveAnchor: string;
    loginButtonColor: string;
    loginButtonBackgroundColor: string;
    loginButtonHoverBorder: string;
    loginButtonHoverBackgroundColor: string;
    loginButtonHoverColor: string;
    signUpButtonBackgroundColor: string;
    signUpButtonHoverBackgroundColor: string;
    balanceBackgroundColor: string;
    balanceHoverBackgroundColor: string;
    balanceBorderColor: string;
    iconContainerBorderLeft: string;
    menuCollapseColor: string;
    bellColor: string;
    rgColor: string;
    rgLogo: string;
    languageSelector: {
      borderColor: string;
      fontColor: string;
      arrowColor: string;
    };
  };
  statusBar: {
    messageColor: string;
    descriptionColor: string;
    selfExcludeBackgroundColor: string;
    selfExcludeBorderColor: string;
    coolOffBackgroundColor: string;
    coolOffBorderColor: string;
  };
  sidebar: {
    backgroundColor: string;
    borderColor: string;
    inactiveGameColor: string;
    activeGameColor: string;
    collapsedMenuColor: string;
    selectedCollapsedMenuItemColor: string;
    collapsedMenuItemHoverColor: string;
    menuItemHoverColor: string;
    selectedCollapsedMenuShadow: string;
    selectedCollapsedMenuItemShadow: string;
    customHomeIcon: string;
    customInPlayLogo: string;
    customUpComingLogo: string;
    badgeColor: string;
    badgeFontColor: string;
  };
  footer: {
    paymentColor: string;
    mainFooterColor: string;
    lowerFooterColor: string;
    secondaryFooterfontColor: string;
    mainFooterfontColor: string;
    mobileDividerColor: string;
    mobileFooterColor: string;
    mobileFooterFontColor: string;
    mobileFooterBorderColor: string;
    mobileFooterHoverColor: string;
    socialIconsColor: string;
    socialIconsHoverColor: string;
    linkHoverColor: string;
    shouldDisplayLogo: boolean;
  };
  pagination: {
    arrowColor: string;
    numberColor: string;
    selectedItemNumberColor: string;
    selectedItemBackgroundColor: string;
    disabledArrowColor: string;
  };
  betslip: {
    emptyBetslipMessageColor: string;
    mobileBetslipTitleColor: string;
    mobileBetslipHeaderBackgroundColor: string;
    badgeFontColor: string;
    tabBadgeColor: string;
    backgroundColor: string;
    activeTabBackgroundColor: string;
    inactiveTabBackgroundColor: string;
    activeTabBorderBottom: string;
    activeTabColor: string;
    inactiveTabColor: string;
    tabsDividerColor: string;
    tabBadgeBackgroundColor: string;
    secondaryTabsBackgroundColor: string;
    listItemBackgroundColor: string;
    listItemBorderBottomColor: string;
    listItemInputBorderColor: string;
    listItemSelectionNameColor: string;
    listItemMatchWinnerTitle: string;
    listItemOddsColor: string;
    loadingSpinnerColor: string;
    boxShadowColor: string;
    listItemRemoveButtonColor: string;
    listItemRemoveButtonHoverColor: string;
    listItemWinnerNameColor: string;
    listItemInputBackgroundColor: string;
    listItemInputColor: string;
    listItemToReturn: {
      titleColor: string;
      valueColor: string;
    };
    iconsColor: string;
    summary: {
      totalStakeTitleColor: string;
      totalStakeValueColor: string;
      possibleReturnTitleColor: string;
      possibleReturnValueColor: string;
      currencyColor: string;
      clearBetslipColor: string;
      clearBetslipHoverColor: string;
    };
    acceptOddsChangeFontColor: string;
    acceptOddsContainerBoxShadowColor: string;
    cancelOddsChangeButtonBackgroundColor: string;
    cancelOddsChangeButtonHoverBackgroundColor: string;
    errors: {
      notEnoughMoneyErrorColor: string;
    };
    listItemInputHoverButtons: {
      backgroundColor: string;
      iconColor: string;
      iconHoverColor: string;
      buttonsDividerColor: string;
    };
  };
  content: {
    backgroundColor: string;
    mainFontColor: string;
    secondaryFontColor: string;
    fixtureList: {
      backgroundColor: string;
      hoverBackgroudColor: string;
      mainFontColor: string;
      dividerColor: string;
      inactiveTabColor: string;
      activeTabBorderBottom: string;
      headerBackgroundColor: string;
      tabsContainerBackgroundColor: string;
      headerColor: string;
      gameNameColor: string;
      tournamentNameColor: string;
      scoreColor: string;
      teamNameColor: string;
      betButtonBackgroundColor: string;
      betButtonBorderColor: string;
      betButtonColor: string;
      marketCountButtonColor: string;
      highlightedBetButtonBackgroundColor: string;
      highlightedBetButtonBorderColor: string;
      highlightedBetButtonColor: string;
      hoverBetButtonBackgroundColor: string;
      hoverBetButtonBorderColor: string;
      hoverBetButtonColor: string;
      gradientFromColor: string;
      gradientToColor: string;
      collapseInactiveArrowColor: string;
      liveBadgeGradientColor: string;
      liveBadgeBackgroundColor: string;
      liveBadgeColor: string;
      loadMoreButtonColor: string;
      loadMoreButtonHoverColor: string;
      loadMoreButtonBackgroundColor: string;
      loadMoreButtonHoverBackgroundColor: string;
      loadMoreButtonShadowColor: string;
      loadMoreButtonHoverShadowColor: string;
      fixtureRowBackgroundColor: string;
      statuses: {
        notStartedColor: string;
        endedColor: string;
        liveColor: string;
        suspendedColor: string;
        finishedColor: string;
        cancelledColor: string;
        abandonedColor: string;
        delayedColor: string;
        unknownColor: string;
        postponedColor: string;
        interruptedColor: string;
        finalizedColor: string;
        closedColor: string;
      };
    };
    changePassword: {
      backgroundColor: string;
    };
    account: {
      titleColor: string;
      pageSubtitleColor: string;
      noDataContainerBackgroundColor: string;
      noDataContainerFontColor: string;
      limits: {
        backgroundColor: string;
        mainFontColor: string;
        textUnderInputColor: string;
        dividerColor: string;
        limitsTitleColor: string;
        inputBackgroundColor: string;
        inputBorderColor: string;
        breakButtonHoverBackgroundColor: string;
        breakMessageColor: string;
        breakTimeInfoColor: string;
        breakTimeColor: string;
      };
      accountHistory: {
        secondaryTitleColor: string;
        backgroundColor: string;
        dividerColor: string;
        successBadgeBackgroundColor: string;
        pendingBadgeBackgroundColor: string;
        rejectedBadgeBackgroundColor: string;
        nameColor: string;
        valueColor: string;
        timeColor: string;
        badgeFontColor: string;
      };
      notifications: {
        backgroundColor: string;
        nameFont: string;
        valueFont: string;
        dividerColor: string;
        buttonBackgroundColor: string;
        buttonHoverBackgroundColor: string;
      };
      betHistory: {
        subtitleColor: string;
        backgroundColor: string;
        betPartBackgroundColor: string;
        detailsButtonBackgroundColor: string;
        detailsButtonHoverBackgroundColor: string;
        detailsButtonColor: string;
        dividerColor: string;
        listItemKeyColor: string;
        listItemValueColor: string;
        periodNameColor: string;
        betPartTitleColor: string;
        marketNameColor: string;
        selectionNameColor: string;
        oddsNameColor: string;
        legOddsColor: string;
        betPartValueColor: string;
        dateColor: string;
        tag: {
          fontColor: string;
          cancelledStatusColor: string;
          voidedStatusColor: string;
          openStatusColor: string;
          lostResultColor: string;
          wonResultColor: string;
        };
      };
    };
    personalData: {
      backgroundColor: string;
      mainFontColor: string;
      nameFont: string;
      changeColor: string;
      changeHoverColor: string;
      dividerColor: string;
      termsDateColor: string;
      buttonBackgroundColor: string;
      buttonHoverBackgroundColor: string;
      buttonFontColor: string;
      buttonHoverFontColor: string;
      deleteModalTitleColor: string;
      deleteModalMessageColor: string;
    };
    settings: {
      nameFont: string;
      backgroundColor: string;
      dividerColor: string;
    };
    rgLimitsHistory: {
      containerBackgroundColor: string;
    };
    staticPage: {
      containerBackgroundColor: string;
      titleColor: string;
      subtitleColor: string;
      h5Color: string;
      contentColor: string;
      table: {
        thBorderColor: string;
        thBackgroundColor: string;
        thColor: string;
        tdBackgroundColor: string;
        tdColor: string;
        rowsDividerColor: string;
        tdSideBorders: string;
        thDivider: string;
        rowBottomBorderColor: string;
        rowTopBorderColor: string;
      };
      list: {
        liColor: string;
        markerColor: string;
      };
      paragraphColor: string;
    };
    table: {
      thBackgroundColor: string;
      thColor: string;
      trNthChildBackgroundColor: string;
      tr2NthChildBackgroundColor: string;
      cellColor: string;
      tdSideBordersColor: string;
    };
  };
  mobileLogo: {
    source: string;
    width: number;
  };
  logo: {
    source: string;
    width: number;
  };
  globalForm: {
    titleColor: string;
    backgroundColor: string;
    fontColor: string;
    inputBackgroundColor: string;
    inputBorderColor: string;
    inputErrorBackgroundColor: string;
    errorBackgroundColor: string;
    alertBackgroundColor: string;
    alertColor: string;
    alertLinkColor: string;
    inputErrorBorderColor: string;
    inputErrorColor: string;
    defaultInputBackgroundHoverColor: string;
    defaultInputBorderHoverColor: string;
    linkColor: string;
    linkHoverColor: string;
    switchBackgroundColor: string;
    switchUncheckedColor: string;
    switchCheckedColor: string;
    dropdownDisabledColor: string;
    radioBackgroundColor: string;
    radioBorderColor: string;
    radioLabelColor: string;
    radioTickColor: string;
    scrollbarBackgroundColor: string;
    scrollbarThumbColor: string;
  };
  modal: {
    backgroundColor: string;
    titleColor: string;
    inputColor: string;
    paragraphColor: string;
    loginModal: {
      headerBackgroundColor: string;
      headerColor: string;
      signUpButtonBackgroundColor: string;
      signUpButtonColor: string;
      signUpButtonHoverBackgroundColor: string;
    };
    registerModal: {
      loginInfoColor: string;
      backButtonButtonBackgroundColor: string;
      backButtonButtonBackgroundHoverColor: string;
      backButtonColor: string;
      stepsDividerBackgroundColor: string;
      stepsIconBackgroundColor: string;
      stepsIconColor: string;
      stepsIconActiveBorderColor: string;
      stepsIconActiveColor: string;
      stepsIconActiveBackgroundColor: string;
      stepsIconFinishedBackgroundColor: string;
      stepsIconFinishedColor: string;
      linkColor: string;
      linkHoverColor: string;
    };
    idComplyModal: {
      cancelButtonButtonBackgroundColor: string;
      cancelButtonButtonBackgroundHoverColor: string;
      cancelButtonColor: string;
    };
    forgotPasswordModal: {
      messageColor: string;
    };
    infoModal: {
      iconColor: string;
      buttonBackgroundColor: string;
      buttonHoverBackgroudnColor: string;
    };
    errorModal: {
      iconColor: string;
      buttonBackgroundColor: string;
      buttonHoverBackgroudnColor: string;
    };
    warningModal: {
      iconColor: string;
      buttonBackgroundColor: string;
      buttonHoverBackgroudnColor: string;
    };
    geocomplyModal: {
      headerIconBackgroundColor: string;
      downloadButtonBackgroundColor: string;
      downloadButtonHoverBackgroundColor: string;
      downloadButtonBorderColor: string;
      downloadButtonHoverBorderColor: string;
      downloadButtonColor: string;
      downloadButtonHoverColor: string;
      downloadButtonDividerColor: string;
      downloadButtonDividerHoverColor: string;
    };
  };
  popover: {
    borderColor: string;
    backgroundColor: string;
    fontColor: string;
  };
  cashier: {
    headerBackgroundColor: string;
    headerFontColor: string;
    dividerColor: string;
    dividerTextColor: string;
    bodyBackgroundColor: string;
    tabsHeaderBackgroundColor: string;
    tabActiveColor: string;
    inactiveTabColor: string;
    activeTabBorderColor: string;
    tabsContentBackgroundColor: string;
  };
  result: {
    backgroundColor: string;
    titleColor: string;
    subtitleColor: string;
    primaryButtonBackgroundColor: string;
    primaryButtonHoverBackgroundColor: string;
    primaryButtonBorderColor: string;
    primaryButtonHoverBorderColor: string;
    primaryButtonHoverColor: string;
    secondaryButtonBackgroundColor: string;
    secondaryButtonHoverBackgroundColor: string;
    secondaryButtonBorderColor: string;
    secondaryButtonHoverBorderColor: string;
    secondaryButtonColor: string;
    secondaryButtonHoverColor: string;
    successSvgBackgroundColor: string;
    errorSvgBackgroundColor: string;
    warningSvgBackgroundColor: string;
    infoSvgBackgroundColor: string;
  };
  landingPage: {
    deviceWidth: {
      large: string;
      medium: string;
      small: string;
    };
    colors: {
      white: string;
      black: string;
      headerBack: string;
      mobileMenuBack: string;
      buttonPrimary: string;
      buttonPrimaryHover: string;
      buttonSecondary: string;
      buttonSecondaryHover: string;
      paraTextColor: string;
      scrollUpButtonHover: string;
    };
  };
};

export const brandTheme: ThemeType = {
  baseGutter: 10,
  spinnerBackgroundColor: "#da3931",
  spinnerContainerBackgroundColor: "rgba(19, 20, 20, 0.4)",
  uiComponents: {
    buttons: {
      primary: {
        backgroundColor: "#00b75b",
        hoverBackgroundColor: "#0c7b43",
        fontColor: "#ffffff",
        hoverFontColor: "#ffffff",
        borderColor: "#00b75b",
        hoverBorderColor: "#0c7b43",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
      default: {
        backgroundColor: "#ffffff",
        hoverBackgroundColor: "#c9caca",
        fontColor: "#000000",
        hoverFontColor: "#000000",
        borderColor: "#ffffff",
        hoverBorderColor: "#c9caca",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
      danger: {
        backgroundColor: "#da3931",
        hoverBackgroundColor: "#12DB79",
        fontColor: "#ffffff",
        hoverFontColor: "#ffffff",
        borderColor: "#da3931",
        hoverBorderColor: "#12DB79",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
    },
    modals: {
      backgroundColor: "#1f2021",
      titleColor: "#ffffff",
      inputColor: "#ffffff",
      paragraphColor: "#8d8d8d",
      primaryButtonBackgroundColor: "#00b75b",
      primaryButtonColor: "#ffffff",
      primaryButtonHoverBackgroundColor: "#0c7b43",
      defaultButtonBackgroundColor: "#ffffff",
      defaultButtonColor: "#000000",
      defaultButtonHoverBackgroundColor: "#c9caca",
      loginModal: {
        headerBackgroundColor: "#1f2021",
        headerColor: "#ffffff",
        signUpButtonBackgroundColor: "#ffffff",
        signUpButtonColor: "#000000",
        signUpButtonHoverBackgroundColor: "#c9caca",
      },
      registerModal: {
        loginInfoColor: "#ffffff",
        backButtonButtonBackgroundColor: "#2f3031",
        backButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
        backButtonColor: "#ffffff",
        loginButtonBackgroundColor: "#ffffff",
        loginButtonColor: "#000000",
        loginButtonHoverBackgroundColor: "#c9caca",
        stepsDividerBackgroundColor: "#000000",
        stepsIconBackgroundColor: "#8d8d8d",
        stepsIconColor: "#ffffff",
        stepsIconActiveBorderColor: "#00b75b",
        stepsIconActiveColor: "#00b75b",
        stepsIconActiveBackgroundColor: "#1a3729",
        stepsIconFinishedBackgroundColor: "#1f2021",
        stepsIconFinishedColor: "#00b75b",
        linkColor: "#8d8d8d",
        linkHoverColor: "#da3931",
      },
      idComplyModal: {
        cancelButtonButtonBackgroundColor: "#2f3031",
        cancelButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
        cancelButtonColor: "#ffffff",
      },
      infoModal: {
        iconColor: "#00b75b",
        buttonBackgroundColor: "#00b75b",
        buttonHoverBackgroudnColor: "#0c7b43",
      },
      errorModal: {
        iconColor: "#da3931",
        buttonBackgroundColor: "#da3931",
        buttonHoverBackgroudnColor: "#00b75b",
      },
      warningModal: {
        iconColor: "#faad14",
        buttonBackgroundColor: "#faad14",
        buttonHoverBackgroudnColor: "#cc8d10",
      },
      geocomplyModal: {
        headerIconBackgroundColor: "#154a31",
        downloadButtonBackgroundColor: "#3d3d3d",
        downloadButtonHoverBackgroundColor: "#153124",
        downloadButtonBorderColor: "#3d3d3d",
        downloadButtonHoverBorderColor: "#00b75b",
        downloadButtonColor: "#ffffff",
        downloadButtonHoverColor: "#ffffff",
        downloadButtonDividerColor: "#4d4d4d",
        downloadButtonDividerHoverColor: "#0c6a3b",
      },
    },
    input: {
      fontColor: "rgb(255, 255, 255)",
      backgroundColor: "#3a3a3a",
      borderColor: "#000000",
      backgroundHoverColor: "#1f2623",
      borderHoverColor: "#00b75b",
      errorBackgroundColor: "#18191a",
      errorBorderColor: "#da3931",
      errorFontColor: "#da3931",
    },
    select: {
      fontColor: "#ffffff",
      backgroundColor: "#2F3031",
      hoverBackgroundColor: "#181818",
      activeBackgroundColor: "#18191A",
      activeIcon: "/images/check.svg",
    },
    checkbox: {
      color: "#8a8a8a",
      backgroundColor: "#47484d",
      tickColor: "#ffffff",
      borderColor: "#404040",
      hoverBackgroudColor: "#2a2a2a",
      checkedBackgroundColor: "#2a2a2a",
    },
  },
  menu: {
    userIcon: "/images/user.svg",
    mobileUserIcon: "/images/user.svg",
    userIconHover: "/images/user-hover.svg",
    backgroundColor: "#000000",
    mobileBackgroundColor: "#000000",
    loginButtonBorderColor: "transparent",
    loginMobileButtonBacgroundColor: "#18191a",
    loginMobileButtonColor: "#ffffff",
    loginMobileButtonBorderColor: "#ffffff",
    signUpButtonBorderColor: "transparent",
    signUpMobileButtonBacgroundColor: "#00b75b",
    signUpMobileButtonColor: "#ffffff",
    signUpMobileButtonBorderColor: "transparent",
    active: "#ffffff",
    activeBorder: "#da3931",
    activeHover: "#da3931",
    inactiveAnchor: "#8d8d8d",
    loginButtonColor: "#00ff2b",
    loginButtonBackgroundColor: "#272727",
    loginButtonHoverBorder: "#00b75b",
    loginButtonHoverBackgroundColor: "#272727",
    loginButtonHoverColor: "#00b75b",
    signUpButtonBackgroundColor: "#da3931",
    signUpButtonHoverBackgroundColor: "#00b75b",
    balanceBackgroundColor: "#00b75b",
    balanceHoverBackgroundColor: "rgba(0, 183, 91, 0.5)",
    balanceBorderColor: "#00b75b",
    iconContainerBorderLeft: "#1e1e1e",
    menuCollapseColor: "#8d8d8d",
    bellColor: "#ffffff",
    rgColor: "#ffffff",
    rgLogo: "/images/rg_logo.svg",
    languageSelector: {
      borderColor: "#2A2A2A",
      fontColor: "#FFFFFF",
      arrowColor: "#FFFFFF",
    },
  },
  statusBar: {
    messageColor: "#ffffff",
    descriptionColor: "#8d8d8d",
    selfExcludeBackgroundColor: "#922526",
    selfExcludeBorderColor: "#DA3931",
    coolOffBackgroundColor: "#705705",
    coolOffBorderColor: "#EBBF2F",
  },
  sidebar: {
    backgroundColor: "#0f0f0f",
    borderColor: "#000000",
    inactiveGameColor: "#6e6f6f",
    activeGameColor: "#ffffff",
    collapsedMenuColor: "#000000",
    selectedCollapsedMenuItemColor: "#da3931",
    collapsedMenuItemHoverColor: "#da3931",
    menuItemHoverColor: "#da3931",
    selectedCollapsedMenuShadow:
      "linear-gradient(to right, #6d0412, rgba(15, 15, 15, 0) 20%)",
    selectedCollapsedMenuItemShadow:
      "linear-gradient(to right, #343434, rgba(15, 15, 15, 0) 20%)",
    customHomeIcon: "/images/home_gray.svg",
    customInPlayLogo: "/images/clock_gray.svg",
    customUpComingLogo: "/images/calendar_gray.svg",
    badgeColor: "#18191a",
    badgeFontColor: "#ffffff",
  },
  footer: {
    paymentColor: "#FFFFFF",
    mainFooterColor: "#0f0f0f",
    lowerFooterColor: "#18191a",
    secondaryFooterfontColor: "#8d8d8d",
    mainFooterfontColor: "#8d8d8d",
    mobileDividerColor: "#000000",
    mobileFooterColor: "#0f0f0f",
    mobileFooterFontColor: "#ffffff",
    mobileFooterBorderColor: "#1e1e1e",
    mobileFooterHoverColor: "#cf001b",
    socialIconsColor: "#8d8d8d",
    socialIconsHoverColor: "#cf001b",
    linkHoverColor: "#da3931",
    shouldDisplayLogo: true,
  },
  pagination: {
    arrowColor: "#ffffff",
    numberColor: "#ffffff",
    selectedItemNumberColor: "#ffffff",
    selectedItemBackgroundColor: "#da3931",
    disabledArrowColor: "#6e6f6f",
  },
  betslip: {
    emptyBetslipMessageColor: "#ffffff",
    mobileBetslipTitleColor: "#ffffff",
    mobileBetslipHeaderBackgroundColor: "#00b75b",
    badgeFontColor: "#1e1e1e",
    backgroundColor: "#1f2021",
    activeTabBackgroundColor: "#2a2a2a",
    inactiveTabBackgroundColor: "#1f2021",
    activeTabBorderBottom: "#da3931",
    activeTabColor: "#ffffff",
    inactiveTabColor: "#8d8d8d",
    tabsDividerColor: "#000000",
    tabBadgeBackgroundColor: "#ffffff",
    tabBadgeColor: "#1e1e1e",
    secondaryTabsBackgroundColor: "#141415",
    listItemBackgroundColor: "#1f2021",
    listItemInputBorderColor: "#1f2021",
    listItemBorderBottomColor: "#000000",
    listItemSelectionNameColor: "#dddddd",
    listItemMatchWinnerTitle: "#8a8a8a",
    listItemOddsColor: "#dddddd",
    loadingSpinnerColor: "#da3931",
    boxShadowColor: "transparent",
    listItemRemoveButtonColor: "#b7b7b7",
    listItemRemoveButtonHoverColor: "#da3931",
    listItemWinnerNameColor: "#dddddd",
    listItemInputBackgroundColor: "#0a0a0a",
    listItemInputColor: "#dddddd",
    listItemToReturn: {
      titleColor: "#767676",
      valueColor: "#00b75b",
    },
    iconsColor: "#ffffff",
    summary: {
      totalStakeTitleColor: "#8a8a8a",
      totalStakeValueColor: "#ffffff",
      possibleReturnTitleColor: "#dddddd",
      possibleReturnValueColor: "#00b75b",
      currencyColor: "#ffffff",
      clearBetslipColor: "#8d8d8d",
      clearBetslipHoverColor: "#da3931",
    },
    acceptOddsChangeFontColor: "#737373",
    acceptOddsContainerBoxShadowColor: "#171717",
    cancelOddsChangeButtonBackgroundColor: "#3d3d3d",
    cancelOddsChangeButtonHoverBackgroundColor: "#434343",
    errors: {
      notEnoughMoneyErrorColor: "#EBBF2F",
    },
    listItemInputHoverButtons: {
      backgroundColor: "#47484d",
      iconColor: "#c2c2c2",
      iconHoverColor: "#00b75b",
      buttonsDividerColor: "black",
    },
  },
  content: {
    backgroundColor: "#18191a",
    mainFontColor: "#ffffff",
    secondaryFontColor: "#8d8d8d",
    fixtureList: {
      backgroundColor: "#18191a",
      hoverBackgroudColor: "#2E2E30",
      mainFontColor: "#ffffff",
      dividerColor: "#000000",
      inactiveTabColor: "#8d8d8d",
      activeTabBorderBottom: "#da3931",
      tabsContainerBackgroundColor: "transparent",
      headerBackgroundColor: "#131414",
      headerColor: "#787979",
      gameNameColor: "#ffffff",
      tournamentNameColor: "#878787",
      scoreColor: "#ffffff",
      teamNameColor: "#ffffff",
      betButtonBackgroundColor: "#252626",
      betButtonBorderColor: "#252626",
      betButtonColor: "#ffffff",
      marketCountButtonColor: "#ffffff",
      highlightedBetButtonBackgroundColor: "rgba(218, 57, 49, 0.1)",
      highlightedBetButtonBorderColor: "#da3931",
      highlightedBetButtonColor: "#ffffff",
      hoverBetButtonBackgroundColor: "#3b3b3b",
      hoverBetButtonBorderColor: "#3b3b3b",
      hoverBetButtonColor: "#ffffff",
      gradientFromColor: "#6d0412",
      gradientToColor: "rgba(15, 15, 15, 0)",
      collapseInactiveArrowColor: "#6e6f6f",
      liveBadgeGradientColor: "#ff2626",
      liveBadgeBackgroundColor: "#ff3131",
      liveBadgeColor: "#ffffff",
      loadMoreButtonColor: "#ffffff",
      loadMoreButtonHoverColor: "#ffffff",
      loadMoreButtonBackgroundColor: "#da3931",
      loadMoreButtonHoverBackgroundColor: "#D22D25",
      loadMoreButtonShadowColor: "#74201c",
      loadMoreButtonHoverShadowColor: "#74201c",
      fixtureRowBackgroundColor: "transparent",
      statuses: {
        notStartedColor: "#8d8d8d",
        endedColor: "#da3931",
        liveColor: "#da3931",
        suspendedColor: "#ffdc35",
        finishedColor: "#da3931",
        cancelledColor: "#da3931",
        abandonedColor: "#da3931",
        delayedColor: "#ffdc35",
        unknownColor: "#ffdc35",
        postponedColor: "#ffdc35",
        interruptedColor: "#da3931",
        finalizedColor: "#00b75b",
        closedColor: "#da3931",
      },
    },
    changePassword: {
      backgroundColor: "#1f2021",
    },
    account: {
      titleColor: "#ffffff",
      pageSubtitleColor: "#7b7b7c",
      noDataContainerBackgroundColor: "#1f2021",
      noDataContainerFontColor: "#8d8d8d",
      limits: {
        backgroundColor: "#1f2021",
        mainFontColor: "#6e6f6f",
        textUnderInputColor: "#00b75b",
        dividerColor: "#000000",
        limitsTitleColor: "#ffffff",
        inputBackgroundColor: "#1f2021",
        inputBorderColor: "#000000",
        breakButtonHoverBackgroundColor: "#00b75b",
        breakMessageColor: "#ffffff",
        breakTimeInfoColor: "#6e6f6f",
        breakTimeColor: "#da3931",
      },
      accountHistory: {
        secondaryTitleColor: "#7b7b7c",
        backgroundColor: "#1f2021",
        dividerColor: "#18191a",
        successBadgeBackgroundColor: "#00b75b",
        pendingBadgeBackgroundColor: "#ebbf2f",
        rejectedBadgeBackgroundColor: "#da3931",
        nameColor: "#8d8d8d",
        valueColor: "#eeeeee",
        timeColor: "#8d8d8d",
        badgeFontColor: "#ffffff",
      },

      notifications: {
        backgroundColor: "#1f2021",
        nameFont: "#7b7b7c",
        valueFont: "#ffffff",
        dividerColor: "#000000",
        buttonBackgroundColor: "#00b75b",
        buttonHoverBackgroundColor: "#0c7b43",
      },
      betHistory: {
        subtitleColor: "#7b7b7c",
        backgroundColor: "#1f2021",
        betPartBackgroundColor: "#18191a",
        detailsButtonBackgroundColor: "#0f0f0f",
        detailsButtonHoverBackgroundColor: "#313133",
        detailsButtonColor: "#ffffff",
        dividerColor: "#000000",
        listItemKeyColor: "#8d8d8d",
        listItemValueColor: "#eeeeee",
        periodNameColor: "#8d8d8d",
        betPartTitleColor: "#8d8d8d",
        marketNameColor: "#ffffff",
        selectionNameColor: "#8d8d8d",
        oddsNameColor: "#ffffff",
        legOddsColor: "#8d8d8d",
        betPartValueColor: "#ffffff",
        dateColor: "#ffffff",
        tag: {
          fontColor: "#ffffff",
          cancelledStatusColor: "#da3931",
          voidedStatusColor: "#ebbf2f",
          openStatusColor: "#4483bc",
          lostResultColor: "#7b7b7c",
          wonResultColor: "#00b75b",
        },
      },
    },
    personalData: {
      backgroundColor: "#1f2021",
      mainFontColor: "#ffffff",
      nameFont: "#7b7b7c",
      changeColor: "#8d8d8d",
      changeHoverColor: "#da3931",
      dividerColor: "#000000",
      termsDateColor: "#da3931",
      buttonBackgroundColor: "#da3931",
      buttonHoverBackgroundColor: "#00b75b",
      buttonFontColor: "#ffffff",
      buttonHoverFontColor: "#ffffff",
      deleteModalTitleColor: "#ffffff",
      deleteModalMessageColor: "#e4e4e4",
    },
    settings: {
      nameFont: "#7b7b7c",
      backgroundColor: "#1f2021",
      dividerColor: "#000000",
    },
    rgLimitsHistory: {
      containerBackgroundColor: "#1f2021",
    },
    staticPage: {
      containerBackgroundColor: "#18191a",
      titleColor: "#ffffff",
      subtitleColor: "#8d8d8d",
      h5Color: "#da3931",
      contentColor: "#8d8d8d",
      table: {
        thBorderColor: "#151616",
        thBackgroundColor: "#151616",
        thColor: "#ffffff",
        tdBackgroundColor: "#1e1f1f",
        tdColor: "#8d8d8d",
        rowsDividerColor: "#0f0f0f",
        tdSideBorders: "#0f0f0f",
        thDivider: "#0f0f0f",
        rowBottomBorderColor: "#0f0f0f",
        rowTopBorderColor: "#0f0f0f",
      },
      list: {
        liColor: "#8d8d8d",
        markerColor: "#00b75b",
      },
      paragraphColor: "#8d8d8d",
    },
    table: {
      thBackgroundColor: "#151616",
      thColor: "#ffffff",
      trNthChildBackgroundColor: "#1f2021",
      tr2NthChildBackgroundColor: "#18191a",
      cellColor: "#d4d4d4",
      tdSideBordersColor: "#151616",
    },
  },
  mobileLogo: {
    source: "/images/logo.svg",
    width: 60,
  },
  logo: {
    source: "/images/logo.svg",
    width: 60,
  },
  globalForm: {
    titleColor: "#ffffff",
    backgroundColor: "#1f2021",
    fontColor: "#7b7b7c",
    inputBackgroundColor: "#3a3a3a",
    inputBorderColor: "#000000",
    inputErrorBackgroundColor: "rgba(218, 57, 49, 0.08)",
    errorBackgroundColor: "#f8d9d8",
    alertBackgroundColor: "#f8d9d8",
    alertColor: "#da3931",
    alertLinkColor: "#21276f",
    inputErrorBorderColor: "#da3931",
    inputErrorColor: "#da3931",
    defaultInputBackgroundHoverColor: "rgba(0, 183, 91, 0.04)",
    defaultInputBorderHoverColor: "#00b75b",
    linkColor: "#8d8d8d",
    linkHoverColor: "#da3931",
    switchBackgroundColor: "#47484d",
    switchUncheckedColor: "#000000",
    switchCheckedColor: "#00b75b",
    dropdownDisabledColor: "#7b7b7c",
    radioBackgroundColor: "#2a2a2a",
    radioBorderColor: "#7b7b7c",
    radioLabelColor: "#7b7b7c",
    radioTickColor: "#8a8a8a",
    scrollbarBackgroundColor: "#363737",
    scrollbarThumbColor: "#da3931",
  },
  modal: {
    backgroundColor: "#1f2021",
    titleColor: "#ffffff",
    inputColor: "#ffffff",
    paragraphColor: "#8d8d8d",
    loginModal: {
      headerBackgroundColor: "#1f2021",
      headerColor: "#ffffff",
      signUpButtonBackgroundColor: "#ffffff",
      signUpButtonColor: "#000000",
      signUpButtonHoverBackgroundColor: "#c9caca",
    },
    registerModal: {
      loginInfoColor: "#ffffff",
      backButtonButtonBackgroundColor: "#2f3031",
      backButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
      backButtonColor: "#ffffff",
      stepsDividerBackgroundColor: "#000000",
      stepsIconBackgroundColor: "#8d8d8d",
      stepsIconColor: "#ffffff",
      stepsIconActiveBorderColor: "#00b75b",
      stepsIconActiveColor: "#00b75b",
      stepsIconActiveBackgroundColor: "#1a3729",
      stepsIconFinishedBackgroundColor: "#1f2021",
      stepsIconFinishedColor: "#00b75b",
      linkColor: "#8d8d8d",
      linkHoverColor: "#da3931",
    },
    idComplyModal: {
      cancelButtonButtonBackgroundColor: "#2f3031",
      cancelButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
      cancelButtonColor: "#ffffff",
    },
    forgotPasswordModal: {
      messageColor: "#7b7b7c",
    },
    infoModal: {
      iconColor: "#00b75b",
      buttonBackgroundColor: "#00b75b",
      buttonHoverBackgroudnColor: "#0c7b43",
    },
    errorModal: {
      iconColor: "#da3931",
      buttonBackgroundColor: "#da3931",
      buttonHoverBackgroudnColor: "#00b75b",
    },
    warningModal: {
      iconColor: "#faad14",
      buttonBackgroundColor: "#faad14",
      buttonHoverBackgroudnColor: "#cc8d10",
    },
    geocomplyModal: {
      headerIconBackgroundColor: "#154a31",
      downloadButtonBackgroundColor: "#3d3d3d",
      downloadButtonHoverBackgroundColor: "#153124",
      downloadButtonBorderColor: "#3d3d3d",
      downloadButtonHoverBorderColor: "#00b75b",
      downloadButtonColor: "#ffffff",
      downloadButtonHoverColor: "#ffffff",
      downloadButtonDividerColor: "#4d4d4d",
      downloadButtonDividerHoverColor: "#0c6a3b",
    },
  },
  popover: {
    borderColor: "#da3931",
    backgroundColor: "#0a0a0a",
    fontColor: "#ffffff",
  },
  cashier: {
    headerBackgroundColor: "#1f2021",
    headerFontColor: "#ffffff",
    dividerColor: "#000000",
    dividerTextColor: "#ffffff",
    bodyBackgroundColor: "#1f2021",
    tabsHeaderBackgroundColor: "#1f2021",
    tabActiveColor: "#ffffff",
    inactiveTabColor: "#8d8d8d",
    activeTabBorderColor: "#da3931",
    tabsContentBackgroundColor: "#1f2021",
  },
  result: {
    backgroundColor: "#1f2021",
    titleColor: "#ffffff",
    subtitleColor: "#8d8d8d",
    primaryButtonBackgroundColor: "#00b75b",
    primaryButtonHoverBackgroundColor: "#0c7b43",
    primaryButtonBorderColor: "#00b75b",
    primaryButtonHoverBorderColor: "#0c7b43",
    primaryButtonHoverColor: "#ffffff",
    secondaryButtonBackgroundColor: "#3a3a3a",
    secondaryButtonHoverBackgroundColor: "#3a3a3a",
    secondaryButtonBorderColor: "#3a3a3a",
    secondaryButtonHoverBorderColor: "#00b75b",
    secondaryButtonColor: "#ffffff",
    secondaryButtonHoverColor: "#00b75b",
    successSvgBackgroundColor: "#12472c",
    errorSvgBackgroundColor: "rgb(80, 37, 33)",
    warningSvgBackgroundColor: "#564d2e",
    infoSvgBackgroundColor: "#2c567c",
  },
  landingPage: {
    deviceWidth: {
      large: "1000px",
      medium: "768px",
      small: "425px",
    },
    colors: {
      white: "#ffffff",
      black: "#000000",
      headerBack: "#0f0f0f",
      mobileMenuBack: "rgba(0, 0, 0, 0.85)",
      buttonPrimary: "#00b75b",
      buttonPrimaryHover: "#0c7b43",
      buttonSecondary: "#272727",
      buttonSecondaryHover: "#000000",
      paraTextColor: "#f1f1f1",
      scrollUpButtonHover: "#00b75b",
    },
  },
};

export const theme: ThemeType = {
  baseGutter: 10,
  spinnerBackgroundColor: "#0f5fef",
  spinnerContainerBackgroundColor: "rgba(255, 255, 255, 0.1)",
  uiComponents: {
    buttons: {
      primary: {
        backgroundColor: "#00b75b",
        hoverBackgroundColor: "#0c7b43",
        fontColor: "#ffffff",
        hoverFontColor: "#ffffff",
        borderColor: "#00b75b",
        hoverBorderColor: "#0c7b43",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
      default: {
        backgroundColor: "#3468ff",
        hoverBackgroundColor: "#c9caca",
        fontColor: "#ffffff",
        hoverFontColor: "#ffffff",
        borderColor: "#3468ff",
        hoverBorderColor: "#c9caca",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
      danger: {
        backgroundColor: "#da3931",
        hoverBackgroundColor: "#12DB79",
        fontColor: "#ffffff",
        hoverFontColor: "#ffffff",
        borderColor: "#da3931",
        hoverBorderColor: "#12DB79",
        disabledBackgroundColor: "#404040",
        disbaledFontColor: "#ffffff",
        disabledBorderColor: "#404040",
      },
    },
    modals: {
      backgroundColor: "#ffffff",
      titleColor: "#a9abb8",
      inputColor: "#21276f",
      paragraphColor: "#21276f",
      primaryButtonBackgroundColor: "#12DB79",
      primaryButtonColor: "#ffffff",
      primaryButtonHoverBackgroundColor: "#0c7b43",
      defaultButtonBackgroundColor: "#3468ff",
      defaultButtonColor: "#ffffff",
      defaultButtonHoverBackgroundColor: "#c9caca",
      loginModal: {
        headerBackgroundColor: "#ffffff",
        headerColor: "#21276f",
        signUpButtonBackgroundColor: "#3468ff",
        signUpButtonColor: "#ffffff",
        signUpButtonHoverBackgroundColor: "#c9caca",
      },
      registerModal: {
        loginInfoColor: "#21276f",
        backButtonButtonBackgroundColor: "#2f3031",
        backButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
        backButtonColor: "#ffffff",
        loginButtonBackgroundColor: "#3468ff",
        loginButtonColor: "#ffffff",
        loginButtonHoverBackgroundColor: "#c9caca",
        stepsDividerBackgroundColor: "#dee5f4",
        stepsIconBackgroundColor: "#a9abb8",
        stepsIconColor: "#ffffff",
        stepsIconActiveBorderColor: "#12db79",
        stepsIconActiveColor: "#12db79",
        stepsIconActiveBackgroundColor: "#ffffff",
        stepsIconFinishedBackgroundColor: "#ffffff",
        stepsIconFinishedColor: "#12DB79",
        linkColor: "#7b7b7c",
        linkHoverColor: "#21276f",
      },
      idComplyModal: {
        cancelButtonButtonBackgroundColor: "#2f3031",
        cancelButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
        cancelButtonColor: "#ffffff",
      },
      infoModal: {
        iconColor: "#12DB79",
        buttonBackgroundColor: "#12DB79",
        buttonHoverBackgroudnColor: "#0c7b43",
      },
      errorModal: {
        iconColor: "#da3931",
        buttonBackgroundColor: "#da3931",
        buttonHoverBackgroudnColor: "#12DB79",
      },
      warningModal: {
        iconColor: "#faad14",
        buttonBackgroundColor: "#faad14",
        buttonHoverBackgroudnColor: "#cc8d10",
      },
      geocomplyModal: {
        headerIconBackgroundColor: "#b7ead1",
        downloadButtonBackgroundColor: "#f3f7fe",
        downloadButtonHoverBackgroundColor: "#3468ff",
        downloadButtonBorderColor: "#f3f7fe",
        downloadButtonHoverBorderColor: "#f3f7fe",
        downloadButtonColor: "#21276f",
        downloadButtonHoverColor: "#ffffff",
        downloadButtonDividerColor: "#dde3ee",
        downloadButtonDividerHoverColor: "#7296ff",
      },
    },
    input: {
      fontColor: "#7b7b7c",
      backgroundColor: "#FAFCFF",
      borderColor: "#DEE5F4",
      backgroundHoverColor: "rgba(0, 183, 91, 0.04)",
      borderHoverColor: "#12DB79",
      errorBackgroundColor: "#dee5f4",
      errorBorderColor: "#da3931",
      errorFontColor: "#21276f",
    },
    select: {
      fontColor: "#21276f",
      backgroundColor: "#FFFFFF",
      hoverBackgroundColor: "#F4F6FB",
      activeBackgroundColor: "#F4F6FB",
      activeIcon: "/images/check.svg",
    },
    checkbox: {
      color: "#21276f",
      backgroundColor: "#ffffff",
      tickColor: "#21276f",
      borderColor: "#404040",
      hoverBackgroudColor: "#ffffff",
      checkedBackgroundColor: "#ffffff",
    },
  },
  menu: {
    userIcon: "/images/user-light.svg",
    mobileUserIcon: "/images/user.svg",
    userIconHover: "/images/user-hover.svg",
    backgroundColor: "#ffffff",
    mobileBackgroundColor: "#252b72",
    loginButtonBorderColor: "transparent",
    loginMobileButtonBacgroundColor: "#252b72",
    loginMobileButtonColor: "#ffffff",
    loginMobileButtonBorderColor: "#ffffff",
    signUpButtonBorderColor: "transparent",
    signUpMobileButtonBacgroundColor: "#00b75b",
    signUpMobileButtonColor: "#ffffff",
    signUpMobileButtonBorderColor: "transparent",
    active: "#21276f",
    activeBorder: "#0f5fef",
    activeHover: "#0f5fef",
    inactiveAnchor: "#8d8d8d",
    loginButtonColor: "#ffffff",
    loginButtonBackgroundColor: "#3468FF",
    loginButtonHoverBackgroundColor: "#0D42DE",
    loginButtonHoverColor: "#ffffff",
    loginButtonHoverBorder: "transparent",
    signUpButtonBackgroundColor: "#12DB79",
    signUpButtonHoverBackgroundColor: "#00B75E",
    balanceBackgroundColor: "#0f5fef",
    balanceHoverBackgroundColor: "#6d9ffc",
    balanceBorderColor: "#0f5fef",
    iconContainerBorderLeft: "#1e1e1e",
    menuCollapseColor: "#8d8d8d",
    bellColor: "#8d8d8d",
    rgColor: "#21276f",
    rgLogo: "/images/rg_logo.svg",
    languageSelector: {
      borderColor: "#dee5f4",
      fontColor: "#21276f",
      arrowColor: "#21276f",
    },
  },
  statusBar: {
    messageColor: "#f9b449",
    descriptionColor: "#FAC97B",
    selfExcludeBackgroundColor: "#922526",
    selfExcludeBorderColor: "#DA3931",
    coolOffBackgroundColor: "#fdebce",
    coolOffBorderColor: "#fdebce",
  },
  sidebar: {
    backgroundColor: "#252b72",
    borderColor: "#343985",
    inactiveGameColor: "#a4a7c4",
    activeGameColor: "#ffffff",
    collapsedMenuColor: "#1A2067",
    selectedCollapsedMenuItemColor: "#12DB79",
    collapsedMenuItemHoverColor: "#12DB79",
    menuItemHoverColor: "#12DB79",
    selectedCollapsedMenuShadow:
      "linear-gradient(to right, #12db79, rgba(15, 15, 15, 0) 20%)",
    selectedCollapsedMenuItemShadow:
      "linear-gradient(to right, transparent, rgba(15, 15, 15, 0) 20%)",
    customHomeIcon: "/images/home_gray.svg",
    customInPlayLogo: "/images/clock_gray.svg",
    customUpComingLogo: "/images/calendar_gray.svg",
    badgeColor: "#333986",
    badgeFontColor: "#ffffff",
  },
  footer: {
    paymentColor: "#FFFFFF",
    secondaryFooterfontColor: "#dee5f4",
    mainFooterfontColor: "#a9abb8",
    mainFooterColor: "#0e1241",
    lowerFooterColor: "#f3f7fe",
    mobileDividerColor: "#000000",
    mobileFooterColor: "#0f0f0f",
    mobileFooterFontColor: "#ffffff",
    mobileFooterBorderColor: "#1e1e1e",
    mobileFooterHoverColor: "#cf001b",
    socialIconsColor: "#8d8d8d",
    socialIconsHoverColor: "#cf001b",
    linkHoverColor: "#da3931",
    shouldDisplayLogo: false,
  },
  pagination: {
    arrowColor: "#6e6f6f",
    numberColor: "#21276f",
    selectedItemBackgroundColor: "#0f5fef",
    selectedItemNumberColor: "#ffffff",
    disabledArrowColor: "#6e6f6f",
  },
  betslip: {
    emptyBetslipMessageColor: "#ffffff",
    mobileBetslipTitleColor: "#ffffff",
    mobileBetslipHeaderBackgroundColor: "#00b75b",
    badgeFontColor: "#1e1e1e",
    backgroundColor: "#f3f7fe",
    activeTabBackgroundColor: "#ffffff",
    inactiveTabBackgroundColor: "#ffffff",
    activeTabBorderBottom: "#3468ff",
    activeTabColor: "#21276f",
    inactiveTabColor: "#d8daf3",
    tabsDividerColor: "#dee5f4",
    tabBadgeBackgroundColor: "#ffffff",
    tabBadgeColor: "#1e1e1e",
    secondaryTabsBackgroundColor: "#f6f8fc",
    listItemBackgroundColor: "#ffffff",
    listItemBorderBottomColor: "#dee5f4",
    listItemSelectionNameColor: "#21276f",
    listItemMatchWinnerTitle: "#a9abb8",
    listItemOddsColor: "#21276f",
    loadingSpinnerColor: "#0f5fef",
    boxShadowColor: "#dee5f4",
    listItemRemoveButtonColor: "#73767e",
    listItemRemoveButtonHoverColor: "#da3931",
    listItemWinnerNameColor: "#21276f",
    listItemInputBackgroundColor: "#ffffff",
    listItemInputBorderColor: "#dee5f4",
    listItemInputColor: "#21276f",
    listItemToReturn: {
      titleColor: "#767676",
      valueColor: "#12DB79",
    },
    iconsColor: "#3468ff",
    summary: {
      totalStakeTitleColor: "#21276f",
      totalStakeValueColor: "#21276f",
      possibleReturnTitleColor: "#21276f",
      possibleReturnValueColor: "#12DB79",
      currencyColor: "#12db79",
      clearBetslipColor: "#a9abb8",
      clearBetslipHoverColor: "#12DB79",
    },
    acceptOddsChangeFontColor: "#737373",
    acceptOddsContainerBoxShadowColor: "#171717",
    cancelOddsChangeButtonBackgroundColor: "#3d3d3d",
    cancelOddsChangeButtonHoverBackgroundColor: "#434343",
    errors: {
      notEnoughMoneyErrorColor: "#EBBF2F",
    },
    listItemInputHoverButtons: {
      backgroundColor: "#dee5f4",
      iconColor: "#21276f",
      iconHoverColor: "#12DB79",
      buttonsDividerColor: "transparent",
    },
  },
  content: {
    backgroundColor: "#f3f7fe",
    mainFontColor: "#8d8d8d",
    secondaryFontColor: "#8d8d8d",
    fixtureList: {
      backgroundColor: "#ffffff",
      hoverBackgroudColor: "rgb(235 240 255)",
      mainFontColor: "#21276f",
      dividerColor: "#dee5f4",
      tabsContainerBackgroundColor: "#f3f7fe",
      inactiveTabColor: "#21276f",
      activeTabBorderBottom: "#12db79",
      headerBackgroundColor: "#f3f7fe",
      headerColor: "#a9abb8",
      gameNameColor: "#ffffff",
      tournamentNameColor: "#cccccc",
      scoreColor: "#ffffff",
      teamNameColor: "#ffffff",
      betButtonBackgroundColor: "#fafcff",
      betButtonBorderColor: "#dee5f4",
      betButtonColor: "#576388",
      marketCountButtonColor: "#a9abb8",
      highlightedBetButtonBackgroundColor: "#3468ff",
      highlightedBetButtonBorderColor: "#3468ff",
      highlightedBetButtonColor: "#ffffff",
      hoverBetButtonBackgroundColor: "#e7e9ef",
      hoverBetButtonBorderColor: "#e7e9ef",
      hoverBetButtonColor: "#252626",
      gradientFromColor: "#1A1F5D",
      gradientToColor: "#3468FF",
      liveBadgeGradientColor: "transparent",
      liveBadgeBackgroundColor: "#ff3131",
      liveBadgeColor: "#ffffff",
      collapseInactiveArrowColor: "#6e6f6f",
      loadMoreButtonColor: "#ffffff",
      loadMoreButtonHoverColor: "#ffffff",
      loadMoreButtonBackgroundColor: "#252b72",
      loadMoreButtonHoverBackgroundColor: "#333A8F",
      loadMoreButtonShadowColor: "transparent",
      loadMoreButtonHoverShadowColor: "transparent",
      fixtureRowBackgroundColor: "#ffffff",
      statuses: {
        notStartedColor: "#8d8d8d",
        endedColor: "#da3931",
        liveColor: "#da3931",
        suspendedColor: "#ffdc35",
        finishedColor: "#da3931",
        cancelledColor: "#da3931",
        abandonedColor: "#da3931",
        delayedColor: "#ffdc35",
        unknownColor: "#ffdc35",
        postponedColor: "#ffdc35",
        interruptedColor: "#da3931",
        finalizedColor: "#12DB79",
        closedColor: "#da3931",
      },
    },
    changePassword: {
      backgroundColor: "#ffffff",
    },
    account: {
      titleColor: "#21276f",
      pageSubtitleColor: "#21276f",
      noDataContainerBackgroundColor: "#ffffff",
      noDataContainerFontColor: "#a9abb8",
      limits: {
        backgroundColor: "#ffffff",
        mainFontColor: "#a9abb8",
        textUnderInputColor: "#12db79",
        dividerColor: "#f3f5f9",
        limitsTitleColor: "#21276f",
        inputBackgroundColor: "#1f2021",
        inputBorderColor: "#000000",
        breakButtonHoverBackgroundColor: "#12DB79",
        breakMessageColor: "#21276f",
        breakTimeInfoColor: "#a9abb8",
        breakTimeColor: "#da3931",
      },
      accountHistory: {
        secondaryTitleColor: "#7b7b7c",
        backgroundColor: "#ffffff",
        dividerColor: "#eef0f3",
        successBadgeBackgroundColor: "#12DB79",
        pendingBadgeBackgroundColor: "#ebbf2f",
        rejectedBadgeBackgroundColor: "#da3931",
        nameColor: "#8d8d8d",
        valueColor: "#21276f",
        timeColor: "#21276f",
        badgeFontColor: "#ffffff",
      },

      notifications: {
        backgroundColor: "#ffffff",
        nameFont: "#a9abb8",
        valueFont: "#ffffff",
        dividerColor: "#f3f5f9",
        buttonBackgroundColor: "#12DB79",
        buttonHoverBackgroundColor: "#0c7b43",
      },
      betHistory: {
        subtitleColor: "#7b7b7c",
        backgroundColor: "#ffffff",
        betPartBackgroundColor: "#fafcff",
        detailsButtonBackgroundColor: "#252b72",
        detailsButtonHoverBackgroundColor: "#3468ff",
        detailsButtonColor: "#ffffff",
        dividerColor: "#eef0f3",
        listItemKeyColor: "#a9abb8",
        listItemValueColor: "#21276f",
        periodNameColor: "#a9abb8",
        betPartTitleColor: "#8d8d8d",
        marketNameColor: "#21276f",
        selectionNameColor: "#a9abb8",
        oddsNameColor: "#21276f",
        legOddsColor: "#a9abb8",
        betPartValueColor: "#21276f",
        dateColor: "#21276f",
        tag: {
          fontColor: "#ffffff",
          cancelledStatusColor: "#da3931",
          voidedStatusColor: "#ebbf2f",
          openStatusColor: "#4483bc",
          lostResultColor: "#7b7b7c",
          wonResultColor: "#00b75b",
        },
      },
    },
    personalData: {
      backgroundColor: "#ffffff",
      mainFontColor: "#21276f",
      nameFont: "#7b7b7c",
      changeColor: "#a9abb8",
      changeHoverColor: "#3468ff",
      dividerColor: "#f3f5f9",
      termsDateColor: "#ff2217",
      buttonBackgroundColor: "#da3931",
      buttonHoverBackgroundColor: "#12DB79",
      buttonFontColor: "#ffffff",
      buttonHoverFontColor: "#ffffff",
      deleteModalTitleColor: "#da3931",
      deleteModalMessageColor: "#21276f",
    },
    settings: {
      nameFont: "#a9abb8",
      backgroundColor: "#ffffff",
      dividerColor: "#f3f5f9",
    },
    rgLimitsHistory: {
      containerBackgroundColor: "#ffffff",
    },
    staticPage: {
      containerBackgroundColor: "#ffffff",
      titleColor: "#21276f",
      subtitleColor: "#21276f",
      h5Color: "#21276f",
      contentColor: "#21276f",
      table: {
        thBorderColor: "rgba(243, 247, 254, 0.27)",
        thBackgroundColor: "#252b72",
        thColor: "#ffffff",
        tdBackgroundColor: "#f3f7fe",
        tdColor: "#21276f",
        rowsDividerColor: "#fafcff",
        tdSideBorders: "#f3f7fe",
        thDivider: "transparent",
        rowBottomBorderColor: "transparent",
        rowTopBorderColor: "transparent",
      },
      list: {
        liColor: "#21276f",
        markerColor: "#00b75b",
      },
      paragraphColor: "#21276f",
    },
    table: {
      thBackgroundColor: "#252b72",
      thColor: "#ffffff",
      trNthChildBackgroundColor: "#ffffff",
      tr2NthChildBackgroundColor: "#f3f7fe",
      cellColor: "#21276f",
      tdSideBordersColor: "transparent",
    },
  },
  mobileLogo: {
    source: "/images/logo.svg",
    width: 60,
  },
  logo: {
    source: "/images/logo.svg",
    width: 60,
  },
  globalForm: {
    titleColor: "#ffffff",
    backgroundColor: "#1f2021",
    fontColor: "#7b7b7c",
    inputBackgroundColor: "#FAFCFF",
    inputBorderColor: "#DEE5F4",
    inputErrorBackgroundColor: "#dee5f4",
    alertBackgroundColor: "#f8d9d8",
    alertColor: "#da3931",
    alertLinkColor: "#21276f",
    inputErrorBorderColor: "#da3931",
    inputErrorColor: "#21276f",
    defaultInputBackgroundHoverColor: "rgba(0, 183, 91, 0.04)",
    errorBackgroundColor: "#f8d9d8",
    defaultInputBorderHoverColor: "#12DB79",
    linkColor: "#8d8d8d",
    linkHoverColor: "#da3931",
    switchBackgroundColor: "#DEE5F4",
    switchUncheckedColor: "#A9ABB8",
    switchCheckedColor: "#12DB79",
    dropdownDisabledColor: "#7b7b7c",
    radioBackgroundColor: "#FAFCFF",
    radioBorderColor: "#DEE5F4",
    radioLabelColor: "#7b7b7c",
    radioTickColor: "#3468FF",
    scrollbarBackgroundColor: "#E6EBF7",
    scrollbarThumbColor: "#3468FF",
  },
  modal: {
    backgroundColor: "#ffffff",
    titleColor: "#a9abb8",
    inputColor: "#21276f",
    paragraphColor: "#21276f",
    loginModal: {
      headerBackgroundColor: "#ffffff",
      headerColor: "#21276f",
      signUpButtonBackgroundColor: "#3468ff",
      signUpButtonColor: "#ffffff",
      signUpButtonHoverBackgroundColor: "#c9caca",
    },
    registerModal: {
      loginInfoColor: "#21276f",
      backButtonButtonBackgroundColor: "#2f3031",
      backButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
      backButtonColor: "#ffffff",
      stepsDividerBackgroundColor: "#dee5f4",
      stepsIconBackgroundColor: "#a9abb8",
      stepsIconColor: "#ffffff",
      stepsIconActiveBorderColor: "#12db79",
      stepsIconActiveColor: "#12db79",
      stepsIconActiveBackgroundColor: "#ffffff",
      stepsIconFinishedBackgroundColor: "#ffffff",
      stepsIconFinishedColor: "#12DB79",
      linkColor: "#7b7b7c",
      linkHoverColor: "#21276f",
    },
    idComplyModal: {
      cancelButtonButtonBackgroundColor: "#2f3031",
      cancelButtonButtonBackgroundHoverColor: "rgba(47, 48, 49, 0.4)",
      cancelButtonColor: "#ffffff",
    },
    forgotPasswordModal: {
      messageColor: "#7b7b7c",
    },
    infoModal: {
      iconColor: "#12DB79",
      buttonBackgroundColor: "#12DB79",
      buttonHoverBackgroudnColor: "#0c7b43",
    },
    errorModal: {
      iconColor: "#da3931",
      buttonBackgroundColor: "#da3931",
      buttonHoverBackgroudnColor: "#12DB79",
    },
    warningModal: {
      iconColor: "#faad14",
      buttonBackgroundColor: "#faad14",
      buttonHoverBackgroudnColor: "#cc8d10",
    },
    geocomplyModal: {
      headerIconBackgroundColor: "#b7ead1",
      downloadButtonBackgroundColor: "#f3f7fe",
      downloadButtonHoverBackgroundColor: "#3468ff",
      downloadButtonBorderColor: "#f3f7fe",
      downloadButtonHoverBorderColor: "#f3f7fe",
      downloadButtonColor: "#21276f",
      downloadButtonHoverColor: "#ffffff",
      downloadButtonDividerColor: "#dde3ee",
      downloadButtonDividerHoverColor: "#7296ff",
    },
  },
  popover: {
    borderColor: "#da3931",
    backgroundColor: "#0a0a0a",
    fontColor: "#ffffff",
  },
  cashier: {
    headerBackgroundColor: "#f3f7fe",
    headerFontColor: "#21276f",
    dividerColor: "#dee5f4",
    dividerTextColor: "",
    bodyBackgroundColor: "#f3f7fe",
    tabsHeaderBackgroundColor: "#f3f7fe",
    tabActiveColor: "",
    inactiveTabColor: "",
    activeTabBorderColor: "",
    tabsContentBackgroundColor: "#f3f7fe",
  },
  result: {
    backgroundColor: "#ffffff",
    titleColor: "#21276f",
    subtitleColor: "#a9abb8",
    primaryButtonBackgroundColor: "#00b75b",
    primaryButtonHoverBackgroundColor: "#0c7b43",
    primaryButtonBorderColor: "#00b75b",
    primaryButtonHoverBorderColor: "#0c7b43",
    primaryButtonHoverColor: "#ffffff",
    secondaryButtonBackgroundColor: "#3468ff",
    secondaryButtonHoverBackgroundColor: "#1f51e0",
    secondaryButtonBorderColor: "#3468ff",
    secondaryButtonHoverBorderColor: "#1f51e0",
    secondaryButtonColor: "#ffffff",
    secondaryButtonHoverColor: "#ffffff",
    successSvgBackgroundColor: "#c1f6dc",
    errorSvgBackgroundColor: "#f2c8c3",
    warningSvgBackgroundColor: "#f9efd1",
    infoSvgBackgroundColor: "#dae4ff",
  },
  landingPage: {
    deviceWidth: {
      large: "1000px",
      medium: "768px",
      small: "425px",
    },
    colors: {
      white: "#ffffff",
      black: "#000000",
      headerBack: "#0f0f0f",
      mobileMenuBack: "rgba(0, 0, 0, 0.85)",
      buttonPrimary: "#00b75b",
      buttonPrimaryHover: "#0c7b43",
      buttonSecondary: "#272727",
      buttonSecondaryHover: "#000000",
      paraTextColor: "#f1f1f1",
      scrollUpButtonHover: "#00b75b",
    },
  },
};
