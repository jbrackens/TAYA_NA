// @ts-nocheck
import { v1 as uuidv1 } from "uuid";
import { getBase64FromPDF } from "@idefix-backoffice/idefix/utils";

import trimZerosForPercentage from "./trimZerosPercentage";

export const getSources = (files: any[], previewPhotos?: boolean) => {
  const sources = files.map(file => {
    if (file.type !== "application/pdf") {
      const previewPhoto = {
        id: uuidv1(),
        preview: file.preview,
        isLoading: true
      };

      return Promise.resolve({
        file: {
          source: file,
          name: file.name
        },
        previewPhoto: previewPhotos ? previewPhoto : undefined
      });
    }

    return getBase64FromPDF(file, file.name);
  });

  return Promise.all(sources);
};

export const normalizePercentage = (value: string) => {
  const stringValue = trimZerosForPercentage(value);
  const isZero = stringValue === "";
  const isNumber = !isNaN(Number(stringValue));
  const isCents = (stringValue.split(".")[1] || "").length <= 2;
  if (isZero) {
    return null;
  }
  if (isNumber && isCents) {
    return stringValue;
  }
};
