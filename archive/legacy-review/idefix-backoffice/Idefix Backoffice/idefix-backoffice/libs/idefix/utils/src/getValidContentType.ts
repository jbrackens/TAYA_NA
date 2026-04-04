const typeList: { [key: string]: string } = {
  doc: "application/msword",
};

export default (fileName: string | undefined, contentType: string) => {
  const fileExt = fileName?.split(".").pop();

  if (fileExt && typeList.hasOwnProperty(fileExt)) {
    return typeList[fileExt];
  }

  return contentType;
};
