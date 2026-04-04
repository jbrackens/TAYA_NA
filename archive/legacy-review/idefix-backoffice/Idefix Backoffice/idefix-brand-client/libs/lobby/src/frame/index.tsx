import React from "react";
import styled from "styled-components";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { useRouter } from "next/router";

interface Props {
  src: string;
}

const FrameContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;

  iframe {
    height: 100%;
  }

  .frame__loader-wrapper {
    position: absolute;
    top: 80px;
    z-index: 1004;
    width: 100%;
    height: calc(100vh - 80px);
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: ${({ theme }) => theme.palette.secondaryLightest};

    svg {
      width: 25%;
      height: 25%;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      top: 60px;
      height: calc(100vh - 60px);
    }
  }
`;

const Frame = ({ src }: Props) => {
  const [links, setLinks] = React.useState<
    (HTMLAnchorElement | HTMLAreaElement)[]
  >([]);
  const [prevSrc, setPrevSrc] = React.useState(src);
  const [contentHeight, setContentHeight] = React.useState(0);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const { Loader } = useRegistry();
  const router = useRouter();

  React.useEffect(() => {
    if (src !== prevSrc) {
      setContentHeight(0);
    }
    setPrevSrc(src);
  }, [src]);

  React.useEffect(() => {
    frameRef.current &&
      frameRef.current.contentWindow &&
      frameRef.current.contentWindow.addEventListener("resize", handleResize, {
        passive: true
      });

    return () => {
      frameRef.current &&
        frameRef.current.contentWindow &&
        frameRef.current.contentWindow.removeEventListener(
          "resize",
          handleResize
        );
      setContentHeight(0);
    };
  }, [frameRef]);

  React.useEffect(() => {
    const handleRoute = (event: any) => {
      event.preventDefault();
      router.push(event.currentTarget.pathname);
    };

    links.map(a => a.addEventListener("click", handleRoute));
    return () => {
      links.map(a => a.removeEventListener("click", handleRoute));
    };
  }, [links]);

  const handleIframeLoad = () => {
    handleResize();
    defineRouteLinks();
  };

  const handleResize = () => {
    if (frameRef.current && frameRef.current.contentWindow) {
      const { body } = frameRef.current.contentWindow.document;
      if (contentHeight !== body.clientHeight)
        setContentHeight(body.clientHeight);
    }
  };

  const defineRouteLinks = () => {
    if (frameRef.current && frameRef.current.contentWindow) {
      const iframeLinks = Array.from(
        frameRef.current.contentWindow.document.links
      ).filter(a => a.href.includes("/loggedin"));

      setLinks(iframeLinks);
    }
  };

  return (
    <FrameContainer>
      {contentHeight === 0 && (
        <div className="frame__loader-wrapper">
          <Loader />
        </div>
      )}
      <iframe
        ref={frameRef}
        frameBorder="0"
        onLoad={handleIframeLoad}
        scrolling={"no"}
        src={src}
        style={{
          width: "1px",
          minWidth: "100%",
          height: `${contentHeight}px`
        }}
      />
    </FrameContainer>
  );
};

export { Frame };
export default Frame;
