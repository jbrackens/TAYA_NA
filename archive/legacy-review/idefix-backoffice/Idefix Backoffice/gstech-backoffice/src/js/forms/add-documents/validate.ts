import { FormValues } from "../../dialogs/add-documents";

export default (values: FormValues & { content?: { text?: string } }) => {
  const errors: { general?: string; photos?: string } = {};

  if ((!values.content || values.content.text === "") && (!values.photos || !values.photos.length)) {
    errors.general = "Needs at least one document";
  }

  if (values.type === "content" && (!values.content || values.content.text === "")) {
    errors.general = "Needs at least one document";
  }

  if (values.type === "photos" && (!values.photos || !values.photos.length)) {
    errors.general = "Needs at least one document";
  }

  if (values.photos && values.photos.length) {
    const photosArrayErrors = [];

    values.photos.forEach((photo, photoIndex) => {
      if (photo.isLoading) {
        photosArrayErrors[photoIndex] = `Photo #${photoIndex + 1} is loading`;
      }
    });

    if (photosArrayErrors.length) {
      errors.photos = "Photos is loading";
    }
  }

  return errors;
};
