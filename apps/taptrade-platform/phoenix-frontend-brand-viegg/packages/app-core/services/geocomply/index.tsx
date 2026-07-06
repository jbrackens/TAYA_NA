import { useToken } from "@phoenix-ui/utils";
import dayjs from "dayjs";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../lib/slices/authSlice";
import { setIsGeocomplyRequired } from "../../lib/slices/settingsSlice";
import {
  evaluateGeoComplyPacket,
  getGeoComplyLicense,
} from "../go-api/compliance/compliance-client";
import type {
  GoGeoComplyLicenseResponse as GeocomplyLicenseResponse,
  GoGeoComplyPacketResponse as GeocomplyPacketResponse,
} from "../go-api/compliance/compliance-types";

export enum GeocomplyResultEnum {
  PASSED = "PASSED",
  REJECTED = "REJECTED",
}

const {
  GEOCOMPLY_ENV,
  GEOCOMPLY_MOBILE_SERVICE_URL,
  GEOCOMPLY_OOBEE_URL,
} = require("next/config").default().publicRuntimeConfig;

declare var GeoComply: any;
declare var GCOobee: any;

const EXPIRY_BUFFER = 60;

type GeoLocationState = {
  reason: string | null;
  isLoading: boolean;
  response?: GeocomplyPacketResponse;
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
  response: GeocomplyPacketResponse | null | undefined;
  isClientConnected: boolean;
};

let geocomplyMobile: any;

export const useGeolocation = (): UseGeolocation => {
  const dispatch = useDispatch();
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [isClientConnected, setIsClientConnected] = useState(false);
  const [geopacket, setGeopacket] = useState<string | null>(null);
  const [isReadyToTrigger, setReadyToTrigger] = useState(false);
  const [licenseValue, setLicenseValue] = useState<string>();
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
    void getGeoComplyLicense()
      .then((license: GeocomplyLicenseResponse) => {
        setLicenseValue(license.value);
      })
      .catch((error) => {
        console.error("Failed to fetch GeoComply license key:", error);
        setIsClientLoading(false);
      });

    if (isMobile) {
      initMobile();
    } else {
      GeoComply.Events.ready(window, initDesktop);
    }
  }, [isUserLoggedIn]);

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
    if (!licenseValue || !userId) return;

    if (isMobile) {
      geocomplyMobile.configure({
        serviceUrl: GEOCOMPLY_MOBILE_SERVICE_URL,
        oobeeUrl: GEOCOMPLY_OOBEE_URL,
        license: licenseValue,
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
      GeoComply.Client.setLicense(licenseValue)
        .setGeolocationReason(reason)
        .setUserId(userId);

      console.log("location check started");
      GeoComply.Client.requestGeolocation();
    }
  }, [isClientConnected, isReadyToTrigger, licenseValue]);

  useEffect(() => {
    if (!geopacket) return;
    void evaluateGeoComplyPacket({ encryptedString: geopacket })
      .then((packetResponse: GeocomplyPacketResponse) => {
        const locationExpiry = dayjs()
          .add(
            packetResponse.anotherGeolocationInSeconds - EXPIRY_BUFFER,
            "s",
          )
          .format();

        setStateRef({
          ...stateRef.current,
          response: packetResponse,
          isLoading: false,
          locationExpiry,
        });
      })
      .catch((error) => {
        console.error("Failed to evaluate GeoComply packet:", error);
        setStateRef({
          ...stateRef.current,
          isLoading: false,
        });
      })
      .finally(() => {
        setReadyToTrigger(false);
      });
  }, [geopacket]);

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
      .on("geolocation", function(data: any) {
        console.log("GC: packetCreated:\r\n" + data);
        setGeopacket(data);
      })
      .on("log", console.log);

    GeoComply.Client.connect(settings.installerID, settings.envId);
  }

  const initMobile = (): void => {
    console.log("GC: initMobile", { geocomplyMobile });
    geocomplyMobile.events
      .on("**", function(this: any) {
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
      .on("geolocation.success", function(data: any) {
        setGeopacket(data);
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
