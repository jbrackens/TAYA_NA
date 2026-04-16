import React from "react";
import { useEffect } from "react";

declare var LiveAgent: {
  createButton: (id: string, element: HTMLElement | null) => void;
};

type LiveChatComponentProps = {};

const LiveChatComponent: React.FC<LiveChatComponentProps> = () => {
  useEffect(() => {
    let scriptUrl = "https://eeg.ladesk.com/scripts/track.js";
    let node = document.createElement("script");
    node.src = scriptUrl;
    node.id = "la_x2s6df8d";
    node.type = "text/javascript";
    node.async = true;
    node.charset = "utf-8";
    node.onload = () => {
      LiveAgent.createButton("6j20lm8x", document.getElementById("chatButton"));
    };
    document.head.appendChild(node);
    () => {
      document.head.removeChild(node);
    };
  }, []);

  return (
    <div id="chatContainer">
      <div id="chatButton" />
    </div>
  );
};

export { LiveChatComponent };
