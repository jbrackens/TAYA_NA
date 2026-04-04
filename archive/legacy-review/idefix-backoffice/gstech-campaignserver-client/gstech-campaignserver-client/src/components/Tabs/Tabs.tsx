import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledTabs = styled.div`
  display: inline-flex;
  position: relative;
  background-color: ${({ theme }) => theme.palette.whiteDirty};
  border-radius: 10px;
  padding: 0 2px;

  &.disabled {
    opacity: 0.65;
  }
`;

export interface TabsProps {
  value: string | number | string[] | boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onChange: (newValue: string | number | string[] | boolean) => void;
}

const Tabs: React.FC<TabsProps> = ({ value, children, className, onChange, disabled, ...rest }) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        onChange(JSON.parse(event.target.value));
      } catch (error) {
        onChange(event.target.value);
      }
    },
    [onChange]
  );

  const transformedChildren = React.Children.map(children, (child: React.ReactNode) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    return React.cloneElement(child, {
      onChange: handleChange,
      checked: child.props.value === value,
      disabled
    } as React.Attributes);
  });

  return (
    <StyledTabs className={cn(className, { disabled })} {...rest}>
      {transformedChildren}
    </StyledTabs>
  );
};

export { Tabs };
