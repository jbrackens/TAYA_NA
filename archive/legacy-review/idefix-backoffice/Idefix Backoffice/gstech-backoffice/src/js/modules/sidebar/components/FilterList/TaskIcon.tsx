import React, { FC } from "react";
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon";

const TaskIcon: FC<SvgIconProps> = props => (
  <SvgIcon {...props} viewBox="-2 -4 24 24">
    <path d="M18 0H2C0.895 0 0 0.895 0 2V14C0 15.105 0.895 16 2 16H18C19.105 16 20 15.105 20 14V2C20 0.895 19.105 0 18 0ZM2 3H6V5H2V3ZM12 13H2V11H12V13ZM16 9H2V7H16V9Z" />
  </SvgIcon>
);

export default TaskIcon;
