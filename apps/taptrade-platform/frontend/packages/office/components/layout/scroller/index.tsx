import React from "react";

type ScrollerProps = {
  children: React.ReactNode;
};

const Scroller = ({ children }: ScrollerProps) => {
  return (
    <div className="relative block h-auto max-h-[75vh] w-full overflow-x-hidden overflow-y-auto bg-[var(--surface-1)]">
      {children}
    </div>
  );
};

export default Scroller;
