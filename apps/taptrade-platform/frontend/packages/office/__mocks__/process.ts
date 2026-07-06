export const setupProcessMock = () => {
  Object.defineProperty(process, "browser", {
    value: "jest",
    writable: false,
  });
};
