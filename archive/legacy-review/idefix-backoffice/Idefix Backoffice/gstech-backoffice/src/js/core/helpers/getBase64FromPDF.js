import { v1 as uuidv1 } from "uuid";
import base64toBlob from "./base64toBlob";

let pdfjs;

(async function () {
  pdfjs = await import("pdfjs-dist/build/pdf");
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry");

  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
})();

function ReadFileAsArrayBuffer(file) {
  const temporaryFileReader = new FileReader();
  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new Error("Problem parsing file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    };
    temporaryFileReader.readAsArrayBuffer(file);
  });
}

export default async function getBase64FromPDF(pdfFile, fileName = "blob") {
  const getPdfPages = pdf => {
    const pdfPagePromises = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pdfPagePromises.push(pdf.getPage(i));
    }

    return Promise.all(pdfPagePromises);
  };

  const renderPdfPage = pages => {
    const scale = 1.5;
    const pageViewPromises = pages.map((page, index) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderTask = page.render({ canvasContext: context, viewport });

      return renderTask.promise.then(() => {
        const dataUrl = canvas.toDataURL("image/png");
        const blob = base64toBlob(dataUrl.replace(/^data:image\/(png|jpg);base64,/, ""));
        return {
          file: {
            source: blob,
            base64: dataUrl,
            name: fileName.replace(".pdf", `#${index + 1}.png`),
          },
          previewPhoto: {
            id: uuidv1(),
            preview: dataUrl,
            isLoading: true,
          },
        };
      });
    });

    return Promise.all(pageViewPromises);
  };

  const binaryData = await ReadFileAsArrayBuffer(pdfFile);
  const loadingTask = pdfjs.getDocument({ data: binaryData });

  return loadingTask.promise.then(getPdfPages).then(renderPdfPage);
}
