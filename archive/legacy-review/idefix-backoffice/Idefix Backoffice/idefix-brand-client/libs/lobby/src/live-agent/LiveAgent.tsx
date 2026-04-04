import * as React from "react";
import { useSelector } from "react-redux";
import Script from "next/script";
import { getLiveAgentConfig } from "../app";

export function LiveAgent() {
  const liveAgentConfig = useSelector(getLiveAgentConfig);

  const handleOnLoadLiveAgentChat = React.useCallback(() => {
    const chatButton = document.getElementById("chatButton");

    if (!chatButton) {
      return;
    }

    if (liveAgentConfig?.visitor) {
      (window as any).LiveAgent.clearAllUserDetails();
      (window as any).LiveAgent.setUserDetails(
        liveAgentConfig.visitor.email,
        liveAgentConfig.visitor.name
      );
    }

    if (liveAgentConfig?.params) {
      liveAgentConfig.params.forEach(param => {
        (window as any).LiveAgent.addContactField(
          param.name.toLowerCase(),
          param.value
        );
      });
    }

    if (liveAgentConfig?.buttonId) {
      (window as any).chatButton = (window as any).LiveAgent.createButton(
        liveAgentConfig.buttonId,
        chatButton
      );
    }
  }, []);

  if (!liveAgentConfig) {
    return null;
  }

  return (
    <Script
      strategy="lazyOnload"
      src={liveAgentConfig.script}
      id={liveAgentConfig.id}
      onLoad={handleOnLoadLiveAgentChat}
    />
  );
}
