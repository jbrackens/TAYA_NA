import { useCallback, useMemo, useState } from "react";
import { DepositMethod } from "@brandserver-client/types";

function useDepositMethod(depositMethods: DepositMethod[]) {
  const [depositMethodUid, setDepositMethodUid] = useState<string>(
    depositMethods[0].uid
  );

  const selectedDepositMethod = useMemo(
    () =>
      depositMethods.find(
        depositMethod => depositMethod.uid === depositMethodUid
      )!,
    [depositMethodUid]
  );

  const onSelectDepositMethod = useCallback(
    (uid: string) => setDepositMethodUid(uid),
    []
  );

  return { selectedDepositMethod, onSelectDepositMethod };
}

export { useDepositMethod };
