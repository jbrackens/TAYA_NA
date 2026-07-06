import {
  MobileMenuComponent,
  MobileMenuCloseButton,
  MobileMenuList,
} from "../index.styled";
import { LandingPageButtonGroup } from "./../LandingPageButtonGroup";
import { ResponsibleGaming } from "../RespGambling";

interface MobileMenuProps {
  display: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  display,
  onClose,
}: MobileMenuProps) => {
  return (
    <MobileMenuComponent className={display ? "show" : "hide"}>
      <div onClick={onClose} className="menu-overlay" />
      <MobileMenuCloseButton onClick={onClose}>X</MobileMenuCloseButton>
      <MobileMenuList>
        <li>
          <ResponsibleGaming />
        </li>
        <li>
          <LandingPageButtonGroup
            customClass="primary large"
            buttonClicked={onClose}
          />
        </li>
      </MobileMenuList>
    </MobileMenuComponent>
  );
};

MobileMenu.defaultProps = {
  display: false,
  onClose: () => {},
};
