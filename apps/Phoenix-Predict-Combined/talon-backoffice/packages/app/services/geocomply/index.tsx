import { useToken } from "@phoenix-ui/utils";
import dayjs from "dayjs";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../lib/slices/authSlice";
import { setIsGeocomplyRequired } from "../../lib/slices/settingsSlice";
import { useApi } from "../api/api-service";

export enum GeocomplyResultEnum {
  PASSED = "PASSED",
  REJECTED = "REJECTED",
}

const {
  GEOCOMPLY_ENV,
  GEOCOMPLY_MOBILE_SERVICE_URL,
  GEOCOMPLY_OOBEE_URL,
} = require("next/config").default().publicRuntimeConfig;

interface GeoComplyEventEmitter {
  on(event: string, handler: (...args: string[]) => void): GeoComplyEventEmitter;
  connect(installerId: string, envId: string): void;
}

interface GeoComplyClient extends GeoComplyEventEmitter {
  CYCLEIP: string;
  CLNT_ERROR_WRONG_OR_MISSING_PARAMETER: string;
  CLNT_ERROR_LICENSE_EXPIRED: string;
  CLNT_ERROR_INVALID_LICENSE_FORMAT: string;
  CLNT_ERROR_SERVER_COMMUNICATION: string;
  CLNT_ERROR_LOCAL_SERVICE_COMMUNICATION: string;
  CLNT_ERROR_LOCAL_SERVICE_UNSUP_VER: string;
  CLNT_ERROR_LOCAL_SERVICE_UNAVAILABLE: string;
  CLNT_ERROR_TRANSACTION_TIMEOUT: string;
  connect(installerId: string, envId: string): void;
  disconnect(): void;
  setLicense(key: string | undefined): GeoComplyClient;
  setGeolocationReason(reason: string | null): GeoComplyClient;
  setUserId(userId: string | null): GeoComplyClient;
  requestGeolocation(): void;
  configure(config: Record<string, unknown>): void;
}

interface GeoComplySDK {
  Client: GeoComplyClient;
  Events: { ready(target: Window, callback: () => void): void };
}

interface GCOobeeMobileClient {
  configure(config: Record<string, unknown>): void;
  connect(opts: Record<string, unknown>, callback: () => void): void;
  request(): void;
  hasGeolocatedRecently(): boolean;
  events: GeoComplyEventEmitter;
  EVENTS: Record<string, string>;
}

interface GCOobeeSDK {
  createClient(): GCOobeeMobileClient;
  utils: { browser: { is: { android: boolean; ios: boolean } } };
}

declare var GeoComply: GeoComplySDK;
declare var GCOobee: GCOobeeSDK;

const EXPIRY_BUFFER = 60;

type GeoLocationState = {
  reason: string | null;
  isLoading: boolean;
  response?: unknown;
  locationExpiry?: string;
};

const initState = {
  reason: null,
  isLoading: false,
} as GeoLocationState;

var settings = {
  installerID: "pwx5OPfLhV",
  envId: GEOCOMPLY_ENV,
};
export type UseGeolocation = {
  disable: () => void;
  triggerLocationCheck: (reason: string) => void;
  clearLocationState: () => void;
  isLoading: boolean;
  response: unknown;
  isClientConnected: boolean;
};

let geocomplyMobile: GCOobeeMobileClient;

export const useGeolocation = (): UseGeolocation => {
  const dispatch = useDispatch();
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const useGeocomplyLicense = useApi("geo-comply/license-key", "GET");
  const useGeocomplyPacket = useApi("geo-comply/geo-packet", "POST");
  const licenseKey = useRef<string | undefined>(undefined);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [isClientConnected, setIsClientConnected] = useState(false);
  const [geopacket, setGeopacket] = useState<string | null>(null);
  const [isReadyToTrigger, setReadyToTrigger] = useState(false);
  const stateRef = useRef<GeoLocationState>(initState);
  const setStateRef = (stateProps: GeoLocationState) => {
    stateRef.current = {
      ...stateProps,
    };
  };
  const { getUserId } = useToken();

  const { reason, isLoading, response } = stateRef.current;

  const disable = (): void => {
    setIsDisabled(true);
  };
  let [isOnline, setIsOnline] = useState(false);

  const setOnline = () => {
    setIsOnline(true);
  };
  const setOffline = () => {
    setIsOnline(false);
  };

  useEffect(() => {
    setIsMobile(
      GCOobee.utils.browser.is.android || GCOobee.utils.browser.is.ios,
    );

    const onUnload = () => {
      GeoComply.Client.disconnect();
      setReadyToTrigger(false);
      setIsClientConnected(false);
      clearLocationState();
    };

    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("online", setOnline);
      window.addEventListener("offline", setOffline);
    };
  }, []);

  useEffect(() => {
    clearLocationState();
  }, [isOnline]);

  const triggerLocationCheck = (reason: string): void => {
    if (!isUserLoggedIn) return;

    setReadyToTrigger(true);
    setStateRef({
      ...stateRef.current,
      reason: reason,
      isLoading: true,
    });
  };

  const clearLocationState = (): void => {
    setStateRef({
      ...stateRef.current,
      response: undefined,
      isLoading: false,
      locationExpiry: undefined,
    });
  };

  const connect = (): void => {
    geocomplyMobile.connect(
      {
        timeout: 15000,
        userAction: true,
      },
      function() {
        geocomplyMobile.request();
      },
    );
  };

  useEffect(() => {
    if (!isMobile) return;
    geocomplyMobile = GCOobee.createClient();
  }, [isMobile]);

  useEffect(() => {
    if (!isUserLoggedIn) {
      clearLocationState();
      return;
    }
    if (isClientLoading) return;
    if (isClientConnected) return;
    if (isDisabled) return;

    setIsClientLoading(true);
    useGeocomplyLicense.triggerApi();

    if (isMobile) {
      initMobile();
    } else {
      GeoComply.Events.ready(window, initDesktop);
    }
  }, [isUserLoggedIn]);

  useEffect(() => {
    if (!useGeocomplyLicense.data) return;
    licenseKey.current = useGeocomplyLicense.data.value;
  }, [useGeocomplyLicense.statusOk]);

  useEffect(() => {
    const locationCheckRequired = stateRef.current.locationExpiry
      ? dayjs().isAfter(dayjs(stateRef.current.locationExpiry))
      : true;

    if (!isReadyToTrigger) return;

    if (!locationCheckRequired) {
      console.log("no geo check needed");

      setStateRef({
        ...stateRef.current,
        isLoading: false,
      });
      setReadyToTrigger(false);
      return;
    }

    const userId = getUserId();

    if (isMobile) {
      geocomplyMobile.configure({
        serviceUrl: GEOCOMPLY_MOBILE_SERVICE_URL,
        oobeeUrl: GEOCOMPLY_OOBEE_URL,
        license: licenseKey.current,
        userId: userId,
        reason: reason,
      });

      if (GCOobee.utils.browser.is.android) {
        connect();
        return;
      } else {
        if (!geocomplyMobile.hasGeolocatedRecently()) {
          connect();
        } else {
          geocomplyMobile.request();
          return;
        }
      }
    } else {
      GeoComply.Client.setLicense(licenseKey.current)
        .setGeolocationReason(reason)
        .setUserId(userId);

      console.log("location check started");
      GeoComply.Client.requestGeolocation();
    }
  }, [isClientConnected, isReadyToTrigger]);

  useEffect(() => {
    if (!geopacket) return;
    useGeocomplyPacket.triggerApi({
      encryptedString: geopacket,
    });
  }, [geopacket]);

  useEffect(() => {
    if (!useGeocomplyPacket.data) return;

    const locationExpiry = dayjs()
      .add(
        useGeocomplyPacket.data.anotherGeolocationInSeconds - EXPIRY_BUFFER,
        "s",
      )
      .format();

    setStateRef({
      ...stateRef.current,
      response: useGeocomplyPacket.data,
      isLoading: false,
      locationExpiry: locationExpiry,
    });

    setReadyToTrigger(false);
  }, [useGeocomplyPacket.statusOk]);

  function initDesktop() {
    console.log("GC: initDesktop");
    GeoComply.Client.on("connect", function() {
      console.log("GeoComply client connected");
      setIsClientConnected(true);
      setIsClientLoading(false);
    })
      .on("error", function(errorCode: string, errorMessage: string) {
        setIsClientLoading(false);
        switch (errorCode) {
          case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_COMMUNICATION:
            break;
          case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_UNSUP_VER:
            break;
          case GeoComply.Client.CLNT_ERROR_LOCAL_SERVICE_UNAVAILABLE:
            dispatch(setIsGeocomplyRequired(true));
            break;
          case GeoComply.Client.CLNT_ERROR_TRANSACTION_TIMEOUT:
            break;
          case GeoComply.Client.CLNT_ERROR_WRONG_OR_MISSING_PARAMETER:
            break;
          case GeoComply.Client.CLNT_ERROR_LICENSE_EXPIRED:
          case GeoComply.Client.CLNT_ERROR_INVALID_LICENSE_FORMAT:
            break;
          case GeoComply.Client.CLNT_ERROR_SERVER_COMMUNICATION:
            break;
        }

        console.log(
          `GeoLocation failed. Details: ErrCode=[${errorCode}] ErrMessage=[${errorMessage}]`,
        );
      })
      .on("geolocation", function(data: string) {
        console.log("GC: packetCreated:\r\n" + data);
        setGeopacket(data || null);
      })
      .on("log", console.log);

    GeoComply.Client.connect(settings.installerID, settings.envId);
  }

  const initMobile = (): void => {
    console.log("GC: initMobile", { geocomplyMobile });
    geocomplyMobile.events
      .on("**", function(this: { event: string }) {
        console.log({ catch: this.event });
      })
      .on("before", function() {})
      .on("log", function() {})
      .on("init.failed", function(code: string, message: string) {
        console.log({ code, message });
      })
      .on("init.success", function() {
        console.log("GC: mobile client connected");
        setIsClientConnected(true);
        setIsClientLoading(false);
      })
      .on("register.before", function() {})
      .on("register.failed", function(code: string, message: string) {
        console.log({ code, message });
      })
      .on("register.success", function() {})
      .on("geolocation.before", function() {})
      .on("geolocation.failed", function(code: string, message: string) {
        console.log({ code, message });
      })
      .on("geolocation.stop_updating", function() {})
      .on(geocomplyMobile.EVENTS.HINT, function() {})
      .on("geolocation.success", function(data: string) {
        setGeopacket(data || null);
      });
  };

  return {
    disable,
    triggerLocationCheck,
    clearLocationState,
    isLoading,
    response,
    isClientConnected,
  };
};
