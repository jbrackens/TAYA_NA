import { generateSBToken } from '../utils/generateSbToken.js';
export function agHttpRequestT(method, url, auth, data) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (auth) {
      var authToken = generateSBToken.getToken();
      xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
    }
    if (data) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.response));
      } else {
        reject(Error(xhr.statusText));
      }
    };
    xhr.onerror = function () {
      reject(Error("Network Error"));
    };
    if (data) {
      xhr.send(data);
    }
    else {
      xhr.send();
    }
  });
}
