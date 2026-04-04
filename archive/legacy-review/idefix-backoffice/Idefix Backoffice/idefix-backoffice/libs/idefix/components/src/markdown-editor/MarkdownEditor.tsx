import React, { FC, useState } from "react";
import ReactMde from "react-mde";
import { marked } from "marked";

import "react-mde/lib/styles/css/react-mde-all.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const Mde: FC<Props> = ({ value, onChange }) => {
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

export { Mde };
