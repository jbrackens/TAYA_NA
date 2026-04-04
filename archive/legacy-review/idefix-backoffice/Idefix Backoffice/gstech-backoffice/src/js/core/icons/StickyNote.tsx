import { FC } from "react";
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon";

const StickyNoteIcon: FC<SvgIconProps> = props => (
  <SvgIcon {...props} viewBox="-4 -2 24 24">
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.8333 2.5H4.16667C3.24583 2.5 2.5 3.24583 2.5 4.16667V15.8333C2.5 16.7542 3.24583 17.5 4.16667 17.5H12.5L17.5 12.5V4.16667C17.5 3.24583 16.7542 2.5 15.8333 2.5ZM5.83333 5.83333H14.1667V7.5H5.83333V5.83333ZM10 10.8333H5.83333V9.16667H10V10.8333ZM11.6667 16.25V11.6667H16.25L11.6667 16.25Z" />
    </svg>
  </SvgIcon>
);

export default StickyNoteIcon;
