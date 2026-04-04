import React, { useState } from 'react';
import styled from 'styled-components';

const TabsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TabList = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  gap: ${({ theme }) => theme.spacing.lg};
`;

interface StyledTabButtonProps {
  $isActive: boolean;
}

const TabButton = styled.button<StyledTabButtonProps>`
  padding: ${({ theme }) => `${theme.spacing.md} 0`};
  background: none;
  border: none;
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.accentBlue : theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  cursor: pointer;
  position: relative;
  transition: color ${({ theme }) => theme.motion.fast};
  border-bottom: 2px solid
    ${({ theme, $isActive }) =>
      $isActive ? theme.colors.accentBlue : 'transparent'};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const TabContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

interface TabItem {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: number;
  onChange?: (index: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab = 0, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    onChange?.(index);
  };

  return (
    <TabsContainer>
      <TabList role="tablist">
        {tabs.map((tab, index) => (
          <TabButton
            key={index}
            role="tab"
            $isActive={activeTab === index}
            onClick={() => handleTabChange(index)}
            aria-selected={activeTab === index}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabList>
      <TabContent role="tabpanel">{tabs[activeTab].content}</TabContent>
    </TabsContainer>
  );
};

export default Tabs;
