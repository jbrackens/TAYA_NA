import { SectionBottomDiv } from "./../index.styled";

interface BottomStyleProps {
  color: string;
  type: number;
}

export const SectionBottomStyle: React.FC<BottomStyleProps> = ({
  color,
  type,
}: BottomStyleProps) => {
  return (
    <SectionBottomDiv $color={color} className={`type-${(type % 4) + 1}`}>
      <div className="style-div-1" />
      <div className="style-div-2" />
    </SectionBottomDiv>
  );
};
