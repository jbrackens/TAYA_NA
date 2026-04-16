import { betsChannelHandler } from "./channels-data-handler/bets-channel-handler";
import { fixturesChannelHandler } from "./channels-data-handler/fixtures-data-hander";
import { marketsChannelHandler } from "./channels-data-handler/markets-data-handler";
import { WalletsChannelHandler } from "./channels-data-handler/wallets-channel-handler";

export type Channel = {
  actions: {
    saveChannelData: (payload?: any, dispatch?: any) => void;
  };
};

export type ChannelsMap = {
  [key: string]: Channel;
};

export const channelsMap: ChannelsMap = {
  bets: {
    actions: {
      saveChannelData: betsChannelHandler,
    },
  },
  market: {
    actions: {
      saveChannelData: marketsChannelHandler,
    },
  },
  fixture: {
    actions: {
      saveChannelData: fixturesChannelHandler,
    },
  },
  wallets: {
    actions: {
      saveChannelData: WalletsChannelHandler,
    },
  },
};
