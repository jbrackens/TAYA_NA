import * as React from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import {
  UserIcon,
  DiceIcon,
  GamepadIcon,
  SoccerBallIcon,
  SlotMachineIcon
} from "@brandserver-client/icons";
import {
  changeLoginOpen,
  setActiveGameCategory,
  BottomNavigation,
  BottomNavigationItem
} from "@brandserver-client/lobby";
import useToolbar from "./useToolbar";

const NonLoggedinToolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { push } = useRouter();

  const { locale, messages, selectedTab, getCategoryByName, handleSelectTab } =
    useToolbar();

  const handleEsportsClick = React.useCallback(() => {
    const url = `/sports/betby?lang=${locale}`;
    const as = `/${locale}/sports/betby`;

    push(url, as);
  }, []);

  const handleSlotsClick = React.useCallback(() => {
    dispatch(setActiveGameCategory("all"));
    const url = `/games?lang=${locale}`;
    const as = `/${locale}/games/all`;
    push(url, as);
  }, []);

  const handleSportsClick = React.useCallback(() => {
    const url = `/sports/betby?lang=${locale}`;
    const as = `/${locale}/sports/betby`;

    push(url, as);
  }, []);

  const handleLiveCasinoClick = React.useCallback(() => {
    dispatch(setActiveGameCategory("live"));
    const url = `/games?lang=${locale}`;
    const as = `/${locale}/games/all`;
    push(url, as);
  }, []);

  const handleLoginClick = React.useCallback(() => {
    dispatch(changeLoginOpen(true));
  }, [dispatch]);

  return (
    <BottomNavigation value={selectedTab} onChange={handleSelectTab}>
      <BottomNavigationItem
        value="esports"
        label={messages.esports}
        icon={<GamepadIcon />}
        onClick={handleEsportsClick}
      />
      <BottomNavigationItem
        value="all"
        label={messages.slots}
        icon={<SlotMachineIcon />}
        onClick={handleSlotsClick}
      />
      <BottomNavigationItem
        value="sports"
        label={messages.sports}
        icon={<SoccerBallIcon />}
        onClick={handleSportsClick}
      />
      <BottomNavigationItem
        value="live"
        label={messages.live}
        icon={<DiceIcon />}
        onClick={handleLiveCasinoClick}
      />
      <BottomNavigationItem
        value="login"
        label={messages.login}
        className="toolbar-item--accent"
        icon={<UserIcon />}
        onClick={handleLoginClick}
      />
    </BottomNavigation>
  );
};

export default NonLoggedinToolbar;
