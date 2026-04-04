import { useCallback, useEffect, useState } from "react";
import { Crop } from "react-image-crop";
import { base64toBlob } from "@idefix-backoffice/idefix/utils";

export const useEditableImage = ({
  src,
  documentId,
  photoId,
  onEditImage
}: {
  src: string;
  documentId: number;
  photoId: string;
  onEditImage: (prevPhotoId: string, blob: any, documentId: number) => void;
}) => {
  const [sources, setSources] = useState([{ src }]);
  const [magnifyingGlassStatus, setMagnifyingGlassStatus] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>({
    unit: "px",
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const [percentCrop, setPercentCrop] = useState({
    unit: "%",
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  const canvas = document.createElement("canvas");

  const getSizes = useCallback(({ image, percentCrop, param }: any) => {
    switch (param) {
      case "x":
        return (image.width * percentCrop.x) / 100;
      case "y":
        return (image.height * percentCrop.y) / 100;
      case "width":
        return (image.width * percentCrop.width) / 100;
      case "height":
        return (image.height * percentCrop.height) / 100;
      default:
        return 0;
    }
  }, []);

  const handleResetState = useCallback(() => {
    setSources([{ src }]);
    setMagnifyingGlassStatus(false);
    setSourceIndex(0);
    setCrop({
      unit: "px",
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });
  }, [src]);

  useEffect(() => {
    handleResetState();
  }, [handleResetState]);

  const handleUpdateSources = useCallback(() => {
    const dataUrl = canvas.toDataURL("image/png", 1);
    const newSources = [...sources.slice(0, sourceIndex + 1), { src: dataUrl }];

    setSources(newSources);
    setSourceIndex(prev => prev + 1);
    setCrop({ unit: "px", x: 0, y: 0, width: 0, height: 0 });
  }, [canvas, sourceIndex, sources]);

  const handleCrop = useCallback(() => {
    const image = new Image();
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    image.onload = () => {
      const canvasWidth = getSizes({ image, percentCrop, param: "width" });
      const canvasHeight = getSizes({ image, percentCrop, param: "height" });

      canvas.setAttribute("width", `${canvasWidth}`);
      canvas.setAttribute("height", `${canvasHeight}`);

      ctx.drawImage(
        image,
        getSizes({ image, percentCrop, param: "x" }),
        getSizes({ image, percentCrop, param: "y" }),
        getSizes({ image, percentCrop, param: "width" }),
        getSizes({ image, percentCrop, param: "height" }),
        0,
        0,
        getSizes({ image, percentCrop, param: "width" }),
        canvasHeight
      );

      handleUpdateSources();
    };

    image.src = sources[sourceIndex].src;
  }, [canvas, getSizes, handleUpdateSources, percentCrop, sourceIndex, sources]);

  const handleDrawBox = useCallback(() => {
    const image = new Image();
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);
      ctx.fillRect(
        getSizes({ image, percentCrop, param: "x" }),
        getSizes({ image, percentCrop, param: "y" }),
        getSizes({ image, percentCrop, param: "width" }),
        getSizes({ image, percentCrop, param: "height" })
      );

      handleUpdateSources();
    };

    image.src = sources[sourceIndex].src;
  }, [canvas, getSizes, handleUpdateSources, percentCrop, sourceIndex, sources]);

  const handleCompleteCrop = useCallback(
    (crop: any, percentCrop: any) => {
      setCrop(crop);
      setPercentCrop(percentCrop);

      const image = new Image();
      const canvas = document.getElementById(String(documentId)) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

      const aspectRatio = crop.width / crop.height;

      const canvasHeight = 400;
      const canvasWidth = canvasHeight * aspectRatio;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      image.onload = () => {
        ctx.drawImage(
          image,
          getSizes({ image, percentCrop, param: "x" }),
          getSizes({ image, percentCrop, param: "y" }),
          getSizes({ image, percentCrop, param: "width" }),
          getSizes({ image, percentCrop, param: "height" }),
          0,
          0,
          canvasWidth,
          canvasHeight
        );
      };

      image.src = sources[sourceIndex].src;
    },
    [documentId, getSizes, sourceIndex, sources]
  );

  const handleRotateImage = useCallback(() => {
    const image = new Image();
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    image.onload = () => {
      const canvasWidth = image.height;
      const canvasHeight = image.width;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const radians = (90 * Math.PI) / 180;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);

      ctx.drawImage(image, -canvasHeight / 2, -canvasWidth / 2, canvasHeight, canvasWidth);
      ctx.restore();

      handleUpdateSources();
    };

    image.src = sources[sourceIndex].src;
  }, [canvas, handleUpdateSources, sourceIndex, sources]);

  const handleStepSource = useCallback((type: string) => {
    if (type === "undo") setSourceIndex(prev => prev - 1);
    if (type === "redo") setSourceIndex(prev => prev + 1);
  }, []);

  const handleCancelEdit = useCallback(() => {
    handleResetState();
  }, [handleResetState]);

  const handleChangeMagnifyingGlassStatus = useCallback(() => setMagnifyingGlassStatus(prev => !prev), []);

  const handleSubmit = useCallback(() => {
    const prevPhotoId = photoId;
    const newImage = sources[sourceIndex].src;

    const blob = base64toBlob(newImage.replace(/^data:image\/(png|jpg);base64,/, ""));
    onEditImage(prevPhotoId, blob, documentId);
  }, [documentId, onEditImage, photoId, sourceIndex, sources]);

  return {
    magnifyingGlassStatus,
    crop,
    sources,
    sourceIndex,
    handleCrop,
    handleDrawBox,
    handleCompleteCrop,
    handleRotateImage,
    handleStepSource,
    handleCancelEdit,
    handleChangeMagnifyingGlassStatus,
    handleSubmit
  };
};
