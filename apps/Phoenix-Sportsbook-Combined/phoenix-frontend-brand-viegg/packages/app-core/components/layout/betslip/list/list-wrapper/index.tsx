import React from "react";
import InfiniteScroll from "react-infinite-scroller";
import { motion } from "framer-motion";
import styled from "styled-components";

type BetslipListProps = {
  infiniteScroll: boolean;
  hasMore?: boolean;
  loading?: boolean;
  handleInfiniteOnLoad: () => void;
};

const LoadingSkeleton = styled(motion.div)`
  height: 56px;
  margin: 8px;
  border-radius: var(--radius-sm);
  background: rgba(33, 55, 67, 0.56);
`;

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
      <>
        {loading && hasMore ? (
          <LoadingSkeleton
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />
        ) : null}
        {children}
      </>
    </InfiniteScroll>
  ) : (
    <>{children}</>
  );
};
export { ListWrapper };
