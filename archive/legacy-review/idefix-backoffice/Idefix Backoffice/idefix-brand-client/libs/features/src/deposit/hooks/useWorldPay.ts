import { useCallback, useState } from "react";
import { CreateDepositResponse } from "@brandserver-client/types";

const INNER_WIDTH = 780;
const IFRAME_INTEGRATION_ID = "worldpayLib";
const TARGET = "worldpay-iframe";

function useWorldPay() {
  const [iframeSrc, setIframeSrc] = useState<undefined | string>(undefined);

  const handleWorldPayResponse = useCallback(
    (response: CreateDepositResponse) => {
      if (response.iframe && window.innerWidth >= INNER_WIDTH) {
        if (response.force && response.options) {
          return setIframeSrc(response.options.url);
        }

        setIframeSrc("");
        if (!window.worldpayLib && !!window.WPCL) {
          window.worldpayLib = new window.WPCL.Library();
        }

        const opts = {
          ...response.options,
          iframeIntegrationId: IFRAME_INTEGRATION_ID,
          target: TARGET
        };

        window.worldpayLib && window.worldpayLib.setup(opts);
        window.dispatchEvent(new Event("load"));
      }

      if (response.options) {
        window.top?.location.assign(response.options.url);
      }
    },
    []
  );

  const handleInitIframeSrc = useCallback(() => setIframeSrc(undefined), []);

  return {
    iframeSrc,
    setIframeSrc,
    handleWorldPayResponse,
    handleInitIframeSrc
  };
}

export { useWorldPay };
