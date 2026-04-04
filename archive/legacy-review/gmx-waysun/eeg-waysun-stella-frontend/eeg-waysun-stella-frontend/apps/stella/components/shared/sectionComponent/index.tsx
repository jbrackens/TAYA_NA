import React, { FC, useRef, useEffect, useState } from "react";
// import { LeftPanel, RightPanel } from "../styled-components/index.styled";
import { LeftPanel, RightPanel, Container } from "./index.style";

type SectionComponentProps = {
  left?: any;
  right?: any;
};

const SectionComponent: FC<SectionComponentProps> = ({
  left = "",
  right = "",
}) => {
  const rightPanelRef = useRef<any>(null);

  const [leftPanelheight, setLeftpanelHeight] = useState(
    rightPanelRef?.current?.clientHeight,
  );

  useEffect(() => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  }, [rightPanelRef?.current?.clientHeight]);

  useEffect(() => {
    window.addEventListener("resize", windwoResized, true);
    window.addEventListener("scroll", windwoResized, true);
    return () => {
      window.removeEventListener("resize", windwoResized, true);
      window.removeEventListener("scroll", windwoResized, true);
    };
  }, []);

  const windwoResized = () => {
    rightPanelRef?.current?.clientHeight &&
      rightPanelRef?.current?.clientHeight !== leftPanelheight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  };

  return (
    <Container>
      <LeftPanel $height={leftPanelheight}>{left}</LeftPanel>
      <RightPanel ref={rightPanelRef}>{right}</RightPanel>
    </Container>
  );
};

export default SectionComponent;
