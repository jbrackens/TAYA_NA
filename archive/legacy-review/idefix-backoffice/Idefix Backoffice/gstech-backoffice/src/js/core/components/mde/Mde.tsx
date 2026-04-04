import React, { useState } from "react";
import ReactMde from "react-mde";
import { marked } from "marked";

import "react-mde/lib/styles/css/react-mde-all.css";

const Mde = ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => {
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");

  return (
    <ReactMde
      value={value}
      onChange={onChange}
      selectedTab={selectedTab}
      onTabChange={setSelectedTab}
      generateMarkdownPreview={markdown =>
        Promise.resolve(<div dangerouslySetInnerHTML={{ __html: marked(markdown) }} />)
      }
    />
  );
};

export default Mde;
