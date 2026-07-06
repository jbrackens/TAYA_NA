import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CoreSpin } from "./../ui/spin";
import {
  selectCashierDrawerVisible,
  hideCashierDrawer,
} from "../../lib/slices/cashierSlice";
import { CashierTitleComponent } from "./cashier-title";
import { useTranslation } from "i18n";
import { CloseButton, StyledDrawer } from "./index.styled";
import { selectIsLoggedIn } from "../../lib/slices/authSlice";
import { useEffect } from "react";

const DRAWER_WIDTH = 400;
const SPINNER_DELAY = 500;

const CashierDrawerComponent: React.FC = () => {
  const dispatch = useDispatch();
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const isCashierDrawerVisible = useSelector(selectCashierDrawerVisible);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const { t } = useTranslation(["cashier"]);

  const onClose = () => {
    setIsIframeLoading(true);
    dispatch(hideCashierDrawer());
  };

  useEffect(() => {
    if (isCashierDrawerVisible && !isUserLoggedIn) {
      onClose();
    }
  }, [isUserLoggedIn]);

  return (
    <StyledDrawer
      title={<CashierTitleComponent />}
      placement="right"
      closable={false}
      onClose={onClose}
      destroyOnClose={true}
      visible={isCashierDrawerVisible}
      width={DRAWER_WIDTH}
    >
      {isIframeLoading ? <CoreSpin size="large" delay={SPINNER_DELAY} /> : ""}
      <iframe
        src="/cashier"
        height="100%"
        width="100%"
        style={{ border: "none" }}
        onLoad={() => setIsIframeLoading(false)}
      ></iframe>
      <CloseButton
        type="default"
        size="large"
        onClick={() => dispatch(hideCashierDrawer())}
      >
        {t("CLOSE_CASHIER_BUTTON")}
      </CloseButton>
    </StyledDrawer>
  );
};

export { CashierDrawerComponent };
