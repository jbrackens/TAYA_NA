import React from "react";
import InfiniteScroll from "react-infinite-scroller";
import { CoreSpin } from "./../../../../ui/spin";

type BetslipListProps = {
  infiniteScroll: boolean;
  hasMore?: boolean;
  loading?: boolean;
  handleInfiniteOnLoad: () => void;
  children?: React.ReactNode;
};

const ListWrapper: React.FC<BetslipListProps> = ({
  children,
  infiniteScroll,
  handleInfiniteOnLoad,
  loading,
  hasMore,
}) => {
  return infiniteScroll ? (
    <InfiniteScroll
      initialLoad={false}
      pageStart={0}
      loadMore={handleInfiniteOnLoad}
      hasMore={!loading && hasMore}
      useWindow={false}
      getScrollParent={() => document.getElementById("ant-list-items")}
    >
      <CoreSpin spinning={loading && hasMore}>{children}</CoreSpin>
    </InfiniteScroll>
  ) : (
    <>{children}</>
  );
};
export { ListWrapper };
