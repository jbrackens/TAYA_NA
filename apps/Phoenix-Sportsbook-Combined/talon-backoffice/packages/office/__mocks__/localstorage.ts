type LocalStorageRecord = {
  [key: string]: string;
};

const ls: LocalStorageRecord = {};

const localStorageMock = {
  getItem: jest.fn().mockImplementation((recordName: string) => {
    return ls[recordName] || null;
  }),
  setItem: jest.fn().mockImplementation((recordName: string, value: string) => {
    ls[recordName] = value;
  }),
  removeItem: jest.fn().mockImplementation((recordName?: string) => {
    if (recordName) {
      delete ls[recordName];
    }
  }),
  clear: jest.fn().mockImplementation(() => {
    Object.keys(ls).forEach((key) => delete ls[key]);
  }),
};

export const setupLocalStorageMock = () => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: false,
  });
};
