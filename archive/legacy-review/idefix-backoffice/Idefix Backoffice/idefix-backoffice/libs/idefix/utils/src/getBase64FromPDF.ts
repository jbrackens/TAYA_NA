import * as pdfjs from "pdfjs-dist";
import { v1 as uuidv1 } from "uuid";
import base64toBlob from "./base64toBlob";

// version should be the same as in the package.json
pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.1.81/pdf.worker.min.js";

function ReadFileAsArrayBuffer(file: any) {
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

export default async function getBase64FromPDF(pdfFile: any, fileName = "blob") {
  const getPdfPages = (pdf: any) => {
    const pdfPagePromises = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pdfPagePromises.push(pdf.getPage(i));
    }

    return Promise.all(pdfPagePromises);
  };

  const renderPdfPage = (pages: any) => {
    const scale = 1.5;
    const pageViewPromises = pages.map((page: any, index: number) => {
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
            name: fileName.replace(".pdf", `#${index + 1}.png`)
          },
          previewPhoto: {
            id: uuidv1(),
            preview: dataUrl,
            isLoading: true
          }
        };
      });
    });

    return Promise.all(pageViewPromises);
  };

  const binaryData = (await ReadFileAsArrayBuffer(pdfFile)) as ArrayBuffer;
  const loadingTask = pdfjs.getDocument(binaryData);

  return loadingTask.promise.then(getPdfPages).then(renderPdfPage);
}
