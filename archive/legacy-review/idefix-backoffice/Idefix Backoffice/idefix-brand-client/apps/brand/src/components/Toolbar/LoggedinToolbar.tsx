import * as React from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import {
  PanicButton,
  MenuIcon,
  SlotMachineIcon,
  TicketIcon,
  GamepadIcon
} from "@brandserver-client/icons";
import { useLogout } from "@brandserver-client/hooks";
import {
  toggleMobileMenu,
  fetchSetExclusion,
  setActiveGameCategory,
  BottomNavigation,
  BottomNavigationItem
} from "@brandserver-client/lobby";
import useToolbar from "./useToolbar";

const LoggedinToolbar: React.FC = () => {
  const logout = useLogout();
  const { push } = useRouter();
  const dispatch = useDispatch();
  const {
    badge,
    messages,
    selectedTab,
    isPanicButton,
    notificationCount,
    getCategoryByName,
    handleSelectTab,
    DepositIcon
  } = useToolbar();

  const handleDepositClick = React.useCallback(() => {
    dispatch(setActiveGameCategory("deposit"));
    push("/loggedin/myaccount/deposit");
  }, [dispatch, push]);

  const handleMyBetsClick = React.useCallback(() => {
    const category = getCategoryByName("sports");
    const url = `/loggedin/sports/${category.game}`;

    push(url);
  }, [dispatch, push, getCategoryByName]);

  const handleSportsClick = React.useCallback(() => {
    const category = getCategoryByName("esports");
    const url = `/loggedin/sports/${category.game}`;

    push(url);
  }, [getCategoryByName]);

  const handleSlotsClick = React.useCallback(() => {
    dispatch(setActiveGameCategory("all"));
    push("/loggedin");
  }, [selectedTab]);

  const handleMobileMenuClick = React.useCallback(
    () => dispatch(toggleMobileMenu()),
    [dispatch]
  );

  const handleSetPauseClick = React.useCallback(async () => {
    try {
      await dispatch(
        fetchSetExclusion({
          limitType: "pause",
          limitLength: 1
        }) as any
      );

      logout();
    } catch (error) {
      console.log(error, "error");
    }
  }, []);

  return (
    <BottomNavigation value={selectedTab} onChange={handleSelectTab}>
      <BottomNavigationItem
        value="deposit"
        label={messages.deposit}
        icon={DepositIcon}
        onClick={handleDepositClick}
      />
      <BottomNavigationItem
        value="mybets"
        label={messages.mybets}
        icon={<TicketIcon />}
        onClick={handleMyBetsClick}
      />
      <BottomNavigationItem
        value="esports"
        className="toolbar-item--main"
        icon={<GamepadIcon />}
        onClick={handleSportsClick}
      />
      <BottomNavigationItem
        value="videoslot"
        badge={notificationCount}
        label={messages.slots}
        icon={<SlotMachineIcon />}
        onClick={handleSlotsClick}
      />
      {isPanicButton ? (
        <BottomNavigationItem
          value="panic"
          label={messages.panic}
          className="toolbar-item--panic"
          icon={<PanicButton />}
          onClick={handleSetPauseClick}
        />
      ) : (
        <BottomNavigationItem
          value="menu"
          label={messages.other}
          badge={badge}
          icon={<MenuIcon />}
          onClick={handleMobileMenuClick}
        />
      )}
    </BottomNavigation>
  );
};

export default LoggedinToolbar;
