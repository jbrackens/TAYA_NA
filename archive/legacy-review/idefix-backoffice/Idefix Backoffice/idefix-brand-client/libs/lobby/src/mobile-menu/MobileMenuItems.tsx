import * as React from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";
import {
  getPendingWithdrawsCount,
  getRewardsCount,
  getBountiesCount,
  getWheelCount,
  getShopItems
} from "../update";
import Link from "next/link";
import NewMobileMenuItem from "./MobileMenuItem";
import { MobileMenuContent } from "./types";
import { MenuLogout } from "@brandserver-client/icons";
import { useLogout } from "@brandserver-client/hooks";

interface Props {
  content: MobileMenuContent[];
  children?: React.ReactNode;
  toggleMobileMenu: () => void;
  className?: string;
}

export const StyledMobileMenuItems = styled.div`
  width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 95px);

  .mobile-menu__item {
    margin-bottom: 20px;
    display: block;
  }
`;

const badgeDataValidation = (value: number | boolean | undefined) => {
  if (
    value !== undefined &&
    value &&
    ((typeof value === "number" && value > 0) || typeof value === "boolean")
  ) {
    return typeof value === "boolean" ? "!" : value;
  }
};

const MobileMenuItems = React.forwardRef<HTMLDivElement, Props>(
  ({ content, toggleMobileMenu, className }, ref) => {
    const logout = useLogout();
    const pendingWithdraws = useSelector(getPendingWithdrawsCount);
    const rewardsCount = useSelector(getRewardsCount);
    const bountiesCount = useSelector(getBountiesCount);
    const wheelCount = useSelector(getWheelCount);
    const shopItems = useSelector(getShopItems);

    const getBadge = (id: string) => {
      switch (id) {
        case "pending":
          return badgeDataValidation(pendingWithdraws);
        case "rewards":
          return badgeDataValidation(rewardsCount);
        case "bounties":
          return badgeDataValidation(bountiesCount);
        case "wheel":
          return badgeDataValidation(wheelCount);
        case "shop":
          return badgeDataValidation(shopItems);
      }
    };

    return (
      <StyledMobileMenuItems className={className} ref={ref}>
        <div className="mobile_menu__items">
          {content.map(({ id, Icon, locale, href, as, onClick }) => {
            if (id === "pending" && pendingWithdraws === 0) return null;
            return (
              <Link href={href!} as={as || ""} key={id}>
                <a className="mobile-menu__item">
                  <NewMobileMenuItem
                    Icon={Icon}
                    locale={locale}
                    badge={getBadge(id)}
                    onClick={() => {
                      toggleMobileMenu();
                      onClick && onClick();
                    }}
                  />
                </a>
              </Link>
            );
          })}
        </div>
        <NewMobileMenuItem
          Icon={MenuLogout}
          locale={"loggedin.logout"}
          onClick={logout}
        />
      </StyledMobileMenuItems>
    );
  }
);

export default MobileMenuItems;
