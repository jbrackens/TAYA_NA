import { createContext } from "react";
import { UseGeolocation } from "../../services/geocomply";

const defaultValue: UseGeolocation = {
  disable: () => {},
  triggerLocationCheck: () => {},
  clearLocationState: () => {},
  isLoading: false,
  response: null,
  isClientConnected: false,
};

const GeocomplyContext = createContext(defaultValue);

export default GeocomplyContext;
