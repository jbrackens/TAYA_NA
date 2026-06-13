import { ImageContainer } from "../index.styled";

interface ImageCompProps {
  image: string;
}

export const ImageComponent: React.FC<ImageCompProps> = ({
  image,
}: ImageCompProps) => {
  return (
    <ImageContainer>
      <img src={`https://cdn.vie.gg/phoenix/static/landing-page/${image}`} />
    </ImageContainer>
  );
};
