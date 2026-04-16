import { TextContainer } from "../index.styled";
import { LandingPageButtonGroup } from "./../LandingPageButtonGroup";
import { ResponsibleGaming } from "../RespGambling";

interface TextProps {
  subHeading: string;
  heading: string;
  children: any;
  buttonStyle: string;
  reverse?: boolean | any;
  hideCta?: boolean;
}

export const TextComponent: React.FC<TextProps> = ({
  subHeading,
  heading,
  children,
  buttonStyle,
  reverse,
  hideCta,
}: TextProps) => {
  return (
    <TextContainer $reverse={reverse} $hideCTA={hideCta ? true : false}>
      <div className="sub-header">{subHeading}</div>
      <div className="header">{heading}</div>
      {children}
      <div className="bottom-section">
        <div className="button-group">
          <LandingPageButtonGroup customClass={`${buttonStyle} large`} />
        </div>
        <div className="resp-game">
          <ResponsibleGaming />
        </div>
      </div>
    </TextContainer>
  );
};
