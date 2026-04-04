export {};

interface Info {
  title: string;
  message: string;
}

type DataLayerEvent = {
  event: string;
  value?: string;
  message?: string;
  info?: { title: string; message: string };
};

interface Constructable<T> {
  new (...args: any): T;
}

interface Library {
  setup: (opts: any) => void;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
    encryptData: (cardNumer: string) => void;
    worldpayLib?: {
      setup: (opts: any) => void;
    };
    WPCL: {
      Library: Constructable<Library>;
    };
    brandserver: {
      addRealityCheckListener: (listener: any) => void;
    };
    showErrorDialog: (message: string) => void;
    showInfo: (info: Info) => void;
    pushRoute: (target: string) => Promise<boolean>;
  }
}
