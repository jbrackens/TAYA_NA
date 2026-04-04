import NoImage from "../icons/NoImage.png";

export const hideBrokenImage = (event: React.ChangeEvent<HTMLImageElement>) => {
  event.target.src = NoImage;
  event.target.onerror = null;
};
