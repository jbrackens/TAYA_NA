import React from "react";
import {
  CloseIconButton,
  TabsContainer,
  TabPanel,
  TabTitle,
  TabsFullWidth,
  TabWithCloseButton,
  MainTab,
  SecondaryTab,
  StyledBadge,
} from "./index.styled";

type Element = {
  title: string;
  count?: number;
  content: React.ReactNode;
  closeBetslip?: (e: React.MouseEvent) => void;
  isDisabled: boolean;
};

export enum TabsTypeEnum {
  MAIN = "MAIN",
  SECONDARY = "SECONDARY",
}

type TabsComponentProps = {
  active: number;
  elements: Array<Element>;
  setTabs: (tab: number) => void;
  type: TabsTypeEnum;
};

const TabsComponent: React.FC<TabsComponentProps> = ({
  elements,
  active,
  setTabs,
  type,
}) => {
  const renderTabWithCloseButton = (
    title: string,
    closeBetslip: (e: React.MouseEvent) => void,
  ) => (
    <TabWithCloseButton>
      <TabTitle withCloseButton>{title}</TabTitle>
      <CloseIconButton onClick={closeBetslip} />
    </TabWithCloseButton>
  );

  const GeneratedTab = type === TabsTypeEnum.MAIN ? MainTab : SecondaryTab;

  return (
    <TabsFullWidth>
      <TabsContainer>
        {elements.map((item, index) => (
          <GeneratedTab
            selected={index === active}
            key={index}
            disabled={item.isDisabled}
            onClick={() => {
              if (!item.isDisabled) {
                setTabs(index);
              }
            }}
          >
            {item.closeBetslip ? (
              renderTabWithCloseButton(item.title, item.closeBetslip)
            ) : (
              <>
                <TabTitle>{item.title}</TabTitle>
                {item.count !== 0 ? <StyledBadge count={item.count} /> : null}
              </>
            )}
          </GeneratedTab>
        ))}
      </TabsContainer>
      {elements.map((element, idx) => (
        <TabPanel key={idx} $active={active === idx}>
          {element.content}
        </TabPanel>
      ))}
    </TabsFullWidth>
  );
};

export { TabsComponent };
