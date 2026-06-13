import {
  LandingSectionWrapper,
  LandingSectionContainer,
} from "../index.styled";
import { TextComponent } from "./../TextComponent";
import { ImageComponent } from "./../ImageComponent";
import { SectionBottomStyle } from "./../SectionBottomStyle";

interface LandingSectionProps {
  key: number;
  backColor: string;
  heading: string;
  subHeading: string;
  content: string[];
  reverse: boolean;
  image: string;
  buttonStyle: string;
  nextSectionColor: string;
  sectionNumber: number;
  hideCta?: boolean;
}

export const LandingSection: React.FC<LandingSectionProps> = ({
  backColor,
  heading,
  subHeading,
  content,
  reverse,
  image,
  buttonStyle,
  nextSectionColor,
  sectionNumber,
  hideCta,
}: LandingSectionProps) => {
  return (
    <LandingSectionWrapper $backColor={backColor}>
      <LandingSectionContainer $reverse={reverse}>
        <ImageComponent image={image} />

        <TextComponent
          reverse={reverse}
          heading={heading}
          subHeading={subHeading}
          buttonStyle={buttonStyle}
          hideCta={hideCta}
        >
          {content.map((paraItem, index) => (
            <p key={index}>{paraItem}</p>
          ))}
        </TextComponent>
      </LandingSectionContainer>
      <SectionBottomStyle color={nextSectionColor} type={sectionNumber} />
    </LandingSectionWrapper>
  );
};

LandingSection.defaultProps = {
  backColor: "#18191a",
  heading: "",
  subHeading: "",
  content: [],
  reverse: false,
  image: "vie-logo-high-res.svg",
  buttonStyle: "primary",
  nextSectionColor: "transparent",
  sectionNumber: 0,
  hideCta: false,
};
