import { FC } from "react";
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon";

const FilterIcon: FC<SvgIconProps> = props => (
  <SvgIcon {...props} viewBox="-4 -2 24 24">
    <path
      d="M0.5 0.5V2.16667H15.5V0.5H0.5ZM2.16667 3.83333L6.33333 8.83333V15.5H9.66667V8.83333L13.8333 3.83333H2.16667Z"
      fill="#9E9E9E"
    />
  </SvgIcon>
);
export default FilterIcon;
