import * as React from "react";
import cn from "classnames";
import styled from "styled-components";
import { useRegistry } from "@brandserver-client/ui";
import { CampaignOption, BonusOption } from "@brandserver-client/types";
import { getDepositBonusIcon } from "../utils";

const StyledBonus = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  cursor: pointer;

  &.disabled {
    pointer-events: none;
  }

  &.bonus {
    padding: 18px 20px 15px;
    background: ${({ theme }) => theme.palette.primaryLightest};
    border-radius: 5px;

    &.toggle {
      box-shadow: none;
    }

    .block__title-text {
      max-width: 200px;
    }

    .block__fields {
      margin: 5px 0 0 0;
      max-width: 230px;
    }
  }

  &.campaign {
    .block__title-text {
      max-width: 240px;
    }

    .block__fields {
      margin: 1px 0 0 23px;
    }
  }

  .block__title {
    display: flex;
    align-items: center;

    &-text {
      margin-left: 9px;
      ${({ theme }) => theme.typography.text14Bold};
      line-height: 23px;
      color: ${({ theme }) => theme.palette.contrastLight};
    }

    &-icon {
      width: 13px;
      fill: ${({ theme }) => theme.palette.contrastLight};
    }
  }

  .block__fields {
    display: flex;
    align-items: center;
    margin: 5px 0 0 23px;
  }

  .block__field + .block__field {
    &::before {
      content: "";
      display: inline-block;
      width: 1px;
      height: 8px;
      margin-left: 5px;
      margin-right: 7px;
      background: ${({ theme }) => theme.palette.secondary};
    }
  }

  .block__field {
    font-size: 14px;
    line-height: 18px;
    color: ${({ theme }) => theme.palette.contrastLight};
  }

  .block__field-value {
    font-weight: bold;
    color: ${({ theme }) => theme.palette.accent2};
  }
`;

interface DepositBonusProps {
  option: BonusOption | CampaignOption;
  value: boolean;
  className?: string;
  type?: Type;
  onToggle: (optionId: string) => void;
}

enum Type {
  campaign = "campaign",
  bonus = "bonus"
}

const DepositBonus: React.FC<DepositBonusProps> & {
  Type: typeof Type;
} = ({ option, className, type = Type.campaign, value, onToggle }) => {
  const { Switcher } = useRegistry();

  const { icon, title, fields, toggle, id } = option;

  const BonusIcon = getDepositBonusIcon(icon);
  const titleText = typeof title === "string" ? title : title.text;

  const handleToggle = React.useCallback(() => onToggle(id), [id]);

  return (
    <StyledBonus
      className={cn(className, type, {
        toggle: value,
        disabled: toggle === "disabled"
      })}
    >
      <div>
        <div className="block__title">
          <BonusIcon className="block__title-icon" />
          <span className="block__title-text">{titleText}</span>
        </div>
        <div className="block__fields">
          {fields.map(field => (
            <div className="block__field" key={field.key}>
              <span className="block__field-key">{field.key}&nbsp;</span>
              <span className="block__field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
      <Switcher
        toggle={value}
        onToggle={handleToggle}
        disabled={toggle === "disabled"}
      />
    </StyledBonus>
  );
};

DepositBonus.Type = Type;

export { DepositBonus };
