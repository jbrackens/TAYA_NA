import { useEffect, useState } from "react";
import debounce from "lodash/debounce";

export interface Dimensions {
  dialogWidth: number;
  dialogHeight: number;
  gameWidth: number;
  gameHeight: number;
  fullScreenDimensions: {
    dialogWidth: number;
    dialogHeight: number;
    gameWidth: number;
    gameHeight: number;
  };
}

type Sizes = {
  overlayWidth: number;
  overlayHeight: number;
  aspectRatio: number;
};

export function useDimensions({
  overlayWidth,
  overlayHeight,
  aspectRatio
}: Sizes) {
  const [dimensions, setDimensions] = useState<Dimensions>(
    calculateBothDimensions({
      overlayWidth,
      overlayHeight,
      aspectRatio
    })
  );

  useEffect(() => {
    const updateDimensions = debounce(
      () =>
        setDimensions(
          calculateBothDimensions({
            overlayWidth,
            overlayHeight,
            aspectRatio
          })
        ),
      250
    );

    updateDimensions();
    window.addEventListener("resize", updateDimensions, { passive: true });
    return () => window.removeEventListener("resize", updateDimensions);
  }, [overlayWidth, overlayHeight, aspectRatio]);

  return dimensions;
}

function calculateBothDimensions(sizes: Sizes): Dimensions {
  const newDimensions = calculateDimensions(sizes);
  const newFullScreenDimensions = calculateDimensions(sizes);

  return {
    ...newDimensions,
    fullScreenDimensions: newFullScreenDimensions
  };
}

function calculateDimensions({
  overlayWidth,
  overlayHeight,
  aspectRatio: targetAspectRatio
}: Sizes) {
  const containerHeight = overlayHeight;
  const containerWidth = overlayWidth;
  const aspectRatio = containerWidth / containerHeight;

  const [gameWidth, gameHeight] =
    aspectRatio < targetAspectRatio
      ? [
          Math.floor(containerWidth),
          Math.floor(containerWidth / targetAspectRatio)
        ]
      : [
          Math.floor(containerHeight * targetAspectRatio),
          Math.floor(containerHeight)
        ];

  return {
    dialogWidth: gameWidth,
    dialogHeight: gameHeight,
    gameWidth,
    gameHeight
  };
}
