import { FC, useEffect, useState } from "react";
import { TabsWrapper, TabsItem, SelectedBorder } from "./index.styled";

type TabsProps = {
  tabs: Array<string>;
  defaultTab?: string;
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
  clickable?: boolean;
};

export const Tabs: FC<TabsProps> = ({
  tabs = [],
  defaultTab = "",
  onTabChange,
  className,
  selectedTab = "",
  clickable = true,
}) => {
  const [currentIndex, setCurrentindex] = useState(-1);
  const [currentTab, setCurrentTab] = useState("");

  useEffect(() => {
    if (selectedTab && selectedTab !== "") {
      setCurrentTab(selectedTab);
      setCurrentindex(tabs.findIndex((item: string) => item === selectedTab));
    }
  });

  useEffect(() => {
    if (defaultTab && defaultTab !== "") {
      setCurrentTab(defaultTab);
      setCurrentindex(tabs.findIndex((item: string) => item === defaultTab));
    }
  }, []);

  const tabChangeHandler = (index: number, event: any) => {
    event.preventDefault();
    onTabChange && onTabChange(tabs[index]);
    if (clickable) {
      setCurrentindex(index);
      setCurrentTab(tabs[index]);
    }
  };

  return (
    <div className={className}>
      <TabsWrapper>
        {tabs.map((tabText, index) => (
          <TabsItem
            key={`${tabText}-${index}`}
            onClick={(e) => tabChangeHandler(index, e)}
            $selected={tabText === currentTab}
            $clickable={clickable}
          >
            {tabText}
          </TabsItem>
        ))}
      </TabsWrapper>
      <SelectedBorder opLength={tabs.length} currentIndex={currentIndex} />
    </div>
  );
};
