import * as React from "react";
import { decode } from "blurhash";

export type Props = React.CanvasHTMLAttributes<HTMLCanvasElement> & {
  hash: string;
  height?: number;
  punch?: number;
  width?: number;
};

const BlurhashCanvas: React.FC<Props> = ({ hash, height = 128, punch, width = 128, ...rest }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (canvasRef.current) {
      try {
        const pixels = decode(hash, width, height, punch);

        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          const imageData = ctx.createImageData(width, height);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [hash, height, punch, width]);

  return <canvas {...rest} height={height} width={width} ref={canvasRef} />;
};

export { BlurhashCanvas };
