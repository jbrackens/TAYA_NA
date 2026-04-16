import React from "react";
import { CoreSelect } from "../../ui/select";

type Props = {
  defaultValue: string | undefined;
};

const NationalitySelect: React.FC<Props> = (props) => {
  const nationalites = require("./data.json");
  const { Option } = CoreSelect;

  const getNationalites = () => {
    let content: React.ReactNode[] = [];

    nationalites.map((nationality: string) =>
      content.push(
        <Option key={nationality} value={nationality}>
          {nationality}
        </Option>,
      ),
    );

    return content;
  };

  return (
    <CoreSelect
      defaultValue={props.defaultValue}
      getPopupContainer={(triggerNode: HTMLElement) =>
        triggerNode.parentNode as HTMLElement
      }
    >
      {getNationalites()}
    </CoreSelect>
  );
};

export { NationalitySelect };
