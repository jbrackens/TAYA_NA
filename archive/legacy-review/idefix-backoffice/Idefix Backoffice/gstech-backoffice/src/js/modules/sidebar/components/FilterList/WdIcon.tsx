import React, { FC } from "react";
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon";

const WdIcon: FC<SvgIconProps> = props => (
  <SvgIcon {...props} viewBox="-2 -4 24 24">
    <path d="M2 0C0.895 0 0 0.895 0 2V3H20V2C20 0.895 19.105 0 18 0H2ZM0 6V14C0 15.105 0.895 16 2 16H18C19.105 16 20 15.105 20 14V6H0Z" />
  </SvgIcon>
);

export default WdIcon;
