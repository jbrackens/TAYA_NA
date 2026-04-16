import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useEffect, useState } from "react";

type FingerprintData = {
  visitorId: string;
  confidence: number;
};

export const useFingerprint = () => {
  const [fingerprintData, setFingerprintData] = useState<
    undefined | FingerprintData
  >();

  useEffect(() => {
    const getFpPromise = async () => {
      const fpPromise = FingerprintJS.load();
      const fp = await fpPromise;
      const result = await fp.get();
      setFingerprintData({
        visitorId: result.visitorId,
        confidence: result.confidence.score,
      });
    };

    getFpPromise();
  }, []);

  return fingerprintData;
};
