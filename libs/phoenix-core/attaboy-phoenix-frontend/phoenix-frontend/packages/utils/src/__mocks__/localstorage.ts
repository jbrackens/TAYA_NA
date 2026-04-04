let localStorageState: any = {};

const localStorageMock = () => ({
  getItem: jest.fn().mockImplementation((key) => localStorageState[key]),
  setItem: jest.fn().mockImplementation((key, token) => {
    localStorageState[key] = token;
  }),
  removeItem: jest.fn().mockImplementation((key) => {
    localStorageState[key] = null;
  }),
  clear: jest.fn().mockImplementation(() => {
    localStorageState = {};
  }),
});

export const setupLocalStorageMock = () => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock(),
    writable: false,
  });
};
