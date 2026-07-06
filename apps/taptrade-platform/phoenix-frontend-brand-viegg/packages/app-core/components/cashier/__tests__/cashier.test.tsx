import reducer, {
  hideCashierDrawer,
  setCurrentBalance,
  showCashierDrawer,
  initialState
} from "../../../lib/slices/cashierSlice";
  
  jest.mock("react-redux", () => ({
    ...jest.requireActual("react-redux"),
    useDispatch: jest.fn(),
    useSelector: jest.fn().mockImplementation(() => {
      return true;
    }),
  }));
  
  //declared becuase of TypeError: window.matchMedia is not a function
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  jest.mock("next/config", () => ({
    default: () => ({
      publicRuntimeConfig: {},
    }),
  }));
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe("Cashier test", () => {
    test("cashierSlice: should return the initial state on first run", () => {
      const nextState = initialState;
      const result = reducer(undefined, { type: "any" });
      expect(result).toEqual(nextState);
    });
  
    test("cashierSlice: should properly change isCashierDrawerVisible to true after showCashierDrawer trigger", () => {
      const nextState = reducer(initialState, showCashierDrawer());
      expect(nextState.isCashierDrawerVisible).toEqual(true);
    });
  
    test("cashierSlice: should properly change isCashierDrawerVisible to false after hideCashierDrawer trigger", () => {
      const testState = {
        isCashierDrawerVisible: true,
        currentBalance: 0,
        isBalanceUpdateNeeded: false,
      };
      const nextState = reducer(testState, hideCashierDrawer());
      expect(nextState.isCashierDrawerVisible).toEqual(false);
    });

    test("cashierSlice: currentBalance should changed after setCurrentBalance trigger", () => {
        const testState = {
          isCashierDrawerVisible: true,
          currentBalance: 0,
          isBalanceUpdateNeeded: false,
        };
        const nextState = reducer(testState, setCurrentBalance(50));
        expect(nextState.currentBalance).toEqual(50);
      });
  });
  