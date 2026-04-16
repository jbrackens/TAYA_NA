import React, { useEffect } from "react";
import { useTranslation } from "i18n";
import { TabsComponent, TabsTypeEnum } from "../tabs";
import { BetslipList } from "../list";
import { SecondaryTabs } from "..";
import { OpenBetsTabContent } from "./open-bets";
import { useSelector } from "react-redux";
import {
  selectOpenBetsSize,
  selectSingleBets,
} from "../../../../lib/slices/betSlice";
const {
  SHOW_FOR_SUBMISSION,
} = require("next/config").default().publicRuntimeConfig;

type MainTabsComponentProps = {
  closeBetSlip: any;
  mainTabs: any;
  setMainTabs: any;
  secondaryTabs: any;
  setSecondaryTabs: any;
};

const MainTabsComponent: React.FC<MainTabsComponentProps> = ({
  closeBetSlip,
  mainTabs,
  setMainTabs,
  secondaryTabs,
  setSecondaryTabs,
}) => {
  const { t } = useTranslation("betslip");
  const openBetsSize = useSelector(selectOpenBetsSize);
  const singleBetsData = useSelector(selectSingleBets);

  useEffect(() => {
    if (secondaryTabs === 1 && singleBetsData.length < 2) {
      setSecondaryTabs(0);
    }
  }, [singleBetsData]);

  return (
    <TabsComponent
      active={mainTabs}
      setTabs={setMainTabs}
      type={TabsTypeEnum.MAIN}
      elements={[
        {
          title: t("BETSLIP"),
          count: singleBetsData.length,
          isDisabled: false,
          content: (
            <TabsComponent
              active={secondaryTabs}
              setTabs={setSecondaryTabs}
              type={TabsTypeEnum.SECONDARY}
              elements={[
                {
                  title: t("SINGLE"),
                  isDisabled: false,
                  content: (
                    <BetslipList
                      betslipData={singleBetsData}
                      noInteract={false}
                      infiniteScroll={false}
                      selectedTab={SecondaryTabs.SINGLE}
                    />
                  ),
                },
                ...(Number(SHOW_FOR_SUBMISSION)
                  ? [
                      {
                        title: t("MULTI"),
                        isDisabled: singleBetsData.length < 2,
                        content: (
                          <BetslipList
                            betslipData={singleBetsData}
                            noInteract={false}
                            infiniteScroll={false}
                            selectedTab={SecondaryTabs.MUTLI}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            ></TabsComponent>
          ),
        },
        {
          title: t("OPEN_BETS"),
          count: openBetsSize,
          closeBetslip: closeBetSlip,
          isDisabled: false,
          content: <OpenBetsTabContent mainTabs={mainTabs} />,
        },
      ]}
    ></TabsComponent>
  );
};
export { MainTabsComponent };
