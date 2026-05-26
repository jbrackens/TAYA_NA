import React, { useState } from 'react';
import { cx } from '../utils/classNames';

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
    <div className="flex flex-col">
      <div className="flex gap-6 border-b border-[#3d3d5c]" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            type="button"
            className={cx(
              'relative cursor-pointer border-0 border-b-2 bg-transparent py-4 text-[14px] font-semibold leading-[20px] transition-colors duration-200 ease-in-out hover:text-white',
              activeTab === index
                ? 'border-[#2196f3] text-[#2196f3]'
                : 'border-transparent text-[#9a9aad]'
            )}
            onClick={() => handleTabChange(index)}
            aria-selected={activeTab === index}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-6" role="tabpanel">
        {tabs[activeTab].content}
      </div>
    </div>
  );
};

export default Tabs;
