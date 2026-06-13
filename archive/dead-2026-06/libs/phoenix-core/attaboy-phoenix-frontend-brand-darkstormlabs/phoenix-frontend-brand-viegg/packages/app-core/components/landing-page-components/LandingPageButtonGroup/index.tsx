import { useDispatch } from "react-redux";
import { useTranslation } from "i18n";
import {
  showAuthModal,
  // showRegisterModal,
} from "../../../lib/slices/authSlice";
import { LandingPageCTA } from "../index.styled";

interface ButtonProps {
  customClass?: string;
  buttonClicked?: () => void;
}

export const LandingPageButtonGroup: React.FC<ButtonProps> = ({
  customClass,
  buttonClicked,
}: ButtonProps) => {
  const { t } = useTranslation(["header"]);
  const dispatch = useDispatch();

  const loginClicked = () => {
    dispatch(showAuthModal());
    buttonClicked && buttonClicked();
  };
  // const registerClicked = () => {
  //   dispatch(showRegisterModal());
  //   buttonClicked && buttonClicked();
  // };

  return (
    <>
      {/* // hiding signup button due to vie.gg shut down */}
      {/* <LandingPageCTA onClick={registerClicked} className={customClass}>
        {t("LANDING_PAGE_REGISTER")}
      </LandingPageCTA> */}
      <LandingPageCTA onClick={loginClicked} className={customClass}>
        {t("LANDING_PAGE_LOGIN")}
      </LandingPageCTA>
    </>
  );
};

LandingPageButtonGroup.defaultProps = {
  customClass: "primary",
  buttonClicked: () => {},
};
