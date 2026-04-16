import React, { useState } from 'react';
import styled from 'styled-components';
import Input from './Input';

const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.large.fontSize};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const LogoIcon = styled.span`
  font-size: 28px;
`;

const NavContainer = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  flex: 1;
  margin-left: ${({ theme }) => theme.spacing.xl};

  ${({ theme }) => theme.breakpoints.md} {
    display: none;
  }
`;

const NavLink = styled.a<{ $active?: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accentBlue : theme.colors.textSecondary};
  text-decoration: none;
  font-weight: 500;
  transition: color ${({ theme }) => theme.motion.fast};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 400px;
  position: relative;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 18px;
`;

const SearchInput = styled(Input)`
  padding-left: 40px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const UserMenuContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${({ theme }) => theme.motion.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.card};
  }
`;

const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
  min-width: 200px;
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const DropdownItem = styled.a`
  display: block;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.fast};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.card};
  }
`;

interface HeaderNavItem {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface HeaderProps {
  logo?: string;
  logoIcon?: string;
  navItems?: HeaderNavItem[];
  onSearch?: (query: string) => void;
  onUserMenuClick?: (action: string) => void;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logo = 'Phoenix UI',
  logoIcon = '🏀',
  navItems = [],
  onSearch,
  onUserMenuClick,
  userName = 'User',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleUserMenuAction = (action: string) => {
    onUserMenuClick?.(action);
    setUserMenuOpen(false);
  };

  return (
    <HeaderContainer>
      <LogoContainer>
        <LogoIcon>{logoIcon}</LogoIcon>
        <span>{logo}</span>
      </LogoContainer>

      <NavContainer>
        {navItems.map((item, index) => (
          <NavLink key={index} $active={item.active} onClick={item.onClick}>
            {item.label}
          </NavLink>
        ))}
      </NavContainer>

      <SearchContainer>
        <SearchIcon>🔍</SearchIcon>
        <SearchInput
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearch}
        />
      </SearchContainer>

      <UserMenuContainer>
        <div style={{ position: 'relative' }}>
          <UserButton onClick={() => setUserMenuOpen(!userMenuOpen)}>
            👤
          </UserButton>
          <Dropdown $open={userMenuOpen}>
            <DropdownItem onClick={() => handleUserMenuAction('profile')}>
              Profile
            </DropdownItem>
            <DropdownItem onClick={() => handleUserMenuAction('settings')}>
              Settings
            </DropdownItem>
            <DropdownItem onClick={() => handleUserMenuAction('logout')}>
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </UserMenuContainer>
    </HeaderContainer>
  );
};

export default Header;
