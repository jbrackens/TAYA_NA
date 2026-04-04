import { useContext } from "react";
import { useTranslation } from "i18n";
import {
  ResponsibleGamingTextContainer,
  ResponsibleGamingLogo,
} from "./../index.styled";
import { ThemeContext } from "styled-components";
import { LinkWrapper } from "../../linkWrapper";

export const ResponsibleGaming: React.FC = () => {
  const theme = useContext(ThemeContext);
  const { t } = useTranslation(["header"]);

  return (
    <LinkWrapper href={"/responsible-gaming"}>
      <>
        <span>
          <ResponsibleGamingLogo src={theme.menu.rgLogo} />
        </span>
        <ResponsibleGamingTextContainer>
          {t("RESPONSIBLE_GAMING_LANDING")}
        </ResponsibleGamingTextContainer>
      </>
    </LinkWrapper>
  );
};
