import { DialogsType, DialogsAction, DialogsTypes } from "./types";
import { Reducer } from "redux";

const initialState: DialogsType = {
  realityCheck: {
    isOpen: false,
    popupFrequency: 0,
    statistics: {
      PlayTimeMinutes: 0
    }
  },
  termsConditions: {
    termsConditions: "",
    privacyPolicy: "",
    bonusTerms: ""
  }
};

const reducer: Reducer<DialogsType, DialogsAction> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case DialogsTypes.FETCH_REALITY_CHECK:
      return {
        ...state,
        realityCheck: {
          ...state.realityCheck,
          ...action.payload
        }
      };
    case DialogsTypes.ACCEPT_REALITY_CHECK:
      return {
        ...state,
        realityCheck: {
          ...state.realityCheck,
          isOpen: action.payload
        }
      };
    case DialogsTypes.FETCH_TERMS_CONDITIONS_CONTENT:
      return {
        ...state,
        termsConditions: {
          ...action.payload
        }
      };
    default:
      return state;
  }
};

export default reducer;
