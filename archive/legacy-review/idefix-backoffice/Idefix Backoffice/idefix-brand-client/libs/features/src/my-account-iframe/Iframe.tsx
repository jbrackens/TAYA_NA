import * as React from "react";
import styled from "styled-components";

const StyledWordplayFrame = styled.div`
  max-width: 750px;
  margin: 0 auto;
`;

const StyledIframe = styled.div`
  height: 700px;
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: transparent;
`;

interface Props {
  src: string;
  onLeave?: () => void;
  type?: string;
}

export const Iframe: React.FC<Props> = ({ src, type, onLeave }) => {
  React.useEffect(() => {
    return () => onLeave && onLeave();
  }, []);

  return type === "worldpay" && src === "" ? (
    <StyledWordplayFrame id="worldpay-iframe" className="iframe__worldpay" />
  ) : (
    <StyledIframe>
      <iframe
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        seamless={true}
      >
        <p>Your browser does not support iframes.</p>
      </iframe>
    </StyledIframe>
  );
};
