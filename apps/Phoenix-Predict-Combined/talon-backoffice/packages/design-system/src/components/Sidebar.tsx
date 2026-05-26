import React, { useState } from 'react';
import { cx } from '../utils/classNames';

interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  items: NavItemConfig[];
  onItemClick?: (itemId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, onItemClick }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleItemClick = (itemId: string) => {
    onItemClick?.(itemId);
  };

  return (
    <div
      className={cx(
        'flex h-screen flex-col overflow-y-auto border-r border-[#3d3d5c] bg-[#2d2d44] p-4 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <button
        className="mb-4 cursor-pointer self-end border-0 bg-transparent p-2 text-[20px] text-white transition-colors duration-200 ease-in-out hover:text-[#2196f3]"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '→' : '←'}
      </button>
      <ul className="m-0 flex-1 list-none p-0">
        {items.map((item) => (
          <li key={item.id} className="mb-2">
            <a
              className={cx(
                'flex cursor-pointer items-center gap-4 whitespace-nowrap rounded-lg px-4 py-2 no-underline transition-all duration-200 ease-in-out hover:bg-[#4a4a5e] hover:text-white',
                item.active
                  ? 'bg-[rgba(33,150,243,0.1)] text-[#2196f3]'
                  : 'bg-transparent text-[#9a9aad]'
              )}
              onClick={() => handleItemClick(item.id)}
            >
              <span className="shrink-0 text-[20px]">{item.icon}</span>
              <span
                className={cx(
                  'text-[14px] font-medium leading-[20px]',
                  collapsed ? 'hidden' : 'block'
                )}
              >
                {item.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
