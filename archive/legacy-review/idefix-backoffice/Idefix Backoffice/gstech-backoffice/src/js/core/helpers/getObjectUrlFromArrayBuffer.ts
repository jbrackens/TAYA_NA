export default (arrayBuffer: number[], contentType = "") => {
  const arrayBufferView = new Uint8Array(arrayBuffer);
  const blob = new Blob([arrayBufferView], { type: contentType });
  return URL.createObjectURL(blob);
};
