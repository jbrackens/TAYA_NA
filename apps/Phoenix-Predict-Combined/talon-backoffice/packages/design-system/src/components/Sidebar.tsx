import React, { useState } from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div<{ $collapsed: boolean }>`
  width: ${({ $collapsed }) => ($collapsed ? '60px' : '240px')};
  background-color: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md};
  transition: width ${({ theme }) => theme.motion.fast};
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  align-self: flex-end;
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.accentBlue};
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
`;

interface StyledNavItemProps {
  $active: boolean;
  $collapsed: boolean;
}

const NavItem = styled.li`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const NavLink = styled.a<StyledNavItemProps>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accentBlue : theme.colors.textSecondary};
  text-decoration: none;
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.fast};
  white-space: nowrap;
  background-color: ${({ theme, $active }) =>
    $active ? 'rgba(33, 150, 243, 0.1)' : 'transparent'};

  &:hover {
    background-color: ${({ theme }) => theme.colors.card};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const NavIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`;

const NavLabel = styled.span<{ $collapsed: boolean }>`
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: 500;
  display: ${({ $collapsed }) => ($collapsed ? 'none' : 'block')};
`;

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
    <SidebarContainer $collapsed={collapsed}>
      <ToggleButton onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '→' : '←'}
      </ToggleButton>
      <NavList>
        {items.map((item) => (
          <NavItem key={item.id}>
            <NavLink
              $active={item.active || false}
              $collapsed={collapsed}
              onClick={() => handleItemClick(item.id)}
            >
              <NavIcon>{item.icon}</NavIcon>
              <NavLabel $collapsed={collapsed}>{item.label}</NavLabel>
            </NavLink>
          </NavItem>
        ))}
      </NavList>
    </SidebarContainer>
  );
};

export default Sidebar;
