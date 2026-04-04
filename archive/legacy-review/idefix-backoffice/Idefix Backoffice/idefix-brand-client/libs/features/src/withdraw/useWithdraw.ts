import { ApiContext } from "@brandserver-client/api";
import { useContext, useState } from "react";
import { pushRoute } from "@brandserver-client/utils";

const useWithdraw = () => {
  const api = useContext(ApiContext);

  const [activationSend, setActivationSend] = useState<boolean>(false);
  const [iframeSource, setIframeSource] = useState<string>("");

  const handleActivationLink = () =>
    api.withdraw.sendActivationLink().then(({ ok }) => setActivationSend(ok));

  const handleBankIdentify = async (id: string) => {
    const data = new URLSearchParams();
    data.append("id", id.toString());

    return api.withdraw.checkBankIdentify(data).then(res => {
      if (!res.ok) {
        pushRoute("/loggedin/myaccount/withdraw-failed");
      } else if (res.usesThirdPartyCookie || window.innerWidth < 991) {
        window.top?.location.assign(res.ReturnURL);
      } else {
        setIframeSource(res.ReturnURL);
      }
    });
  };

  return {
    activationSend,
    iframeSource,
    handleActivationLink,
    handleBankIdentify
  };
};

export { useWithdraw };
