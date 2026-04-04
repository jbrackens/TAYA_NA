import { FetchApi, PhotosAPI } from "./types";
import { PREFIX } from "./";

export default (
  fetchApi: FetchApi,
  handleResponse: (response: Response) => void,
  authorizationToken: () => string,
): PhotosAPI => ({
  uploadPhoto: (photoDraft, photoName) => {
    const data = new FormData();
    if (photoName) {
      data.append("photo", photoDraft, photoName);
    } else {
      data.append("photo", photoDraft);
    }

    return fetch(`${PREFIX}/photos`, {
      method: "POST",
      body: data,
      headers: {
        Authorization: authorizationToken(),
      },
    }).then(handleResponse) as any;
  },
  removePhoto: photoId =>
    fetchApi(`${PREFIX}/photos/${photoId}`, {
      method: "delete",
    }),
  getDocument: photoId => fetch(`${PREFIX}/photos/${photoId}`),
});
