import React from "react";
import {
  TabsContainer,
  TabTitle,
  TabsFullWidth,
  TabWithCloseButton,
  MainTab,
  SecondaryTab,
  StyledBadge,
} from "./index.styled";
import { CloseOutlined } from "@ant-design/icons";

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
      <TabTitle withCloseButton={true}>{title}</TabTitle>
      <CloseOutlined onClick={closeBetslip} style={{ marginLeft: "auto" }} />
    </TabWithCloseButton>
  );

  const generateTabs = () => {
    const GeneratedTab = type === TabsTypeEnum.MAIN ? MainTab : SecondaryTab;
    return elements.map((item, index) => (
      <GeneratedTab
        selected={index === active}
        key={index}
        disabled={item.isDisabled}
        onClick={() => (item.isDisabled ? () => {} : setTabs(index))}
      >
        {item.closeBetslip ? (
          renderTabWithCloseButton(item.title, item.closeBetslip)
        ) : (
          <>
            <TabTitle>{item.title}</TabTitle>
            {item.count !== 0 && <StyledBadge count={item.count} />}
          </>
        )}
      </GeneratedTab>
    ));
  };

  return (
    <TabsFullWidth>
      <TabsContainer>{generateTabs()}</TabsContainer>
      {elements.map((el, idx) => (
        <div key={idx} style={{ display: active === idx ? "block" : "none" }}>
          {el.content}
        </div>
      ))}
    </TabsFullWidth>
  );
};

export { TabsComponent };
