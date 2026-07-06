import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectIsGeocomplyLocationFailed,
  selectIsGeocomplyRequired,
  setIsGeocomplyRequired,
  setIsGeocomplyLocationFailed,
} from "../../lib/slices/settingsSlice";
import { ResultModalComponent } from "../modals/result-modal";
import { StatusEnum } from "../results";
import { useTranslation } from "i18n";
import { DownloadButton, VerticalDivider } from "./index.styled";
import { useRouter } from "next/router";

type GeoComplyComponentProps = {};

const GeoComplyError: React.FC<GeoComplyComponentProps> = () => {
  const dispatch = useDispatch();
  const isGeocomplyLocationFailed = useSelector(
    selectIsGeocomplyLocationFailed,
  );
  const isGeocomplyRequired = useSelector(selectIsGeocomplyRequired);
  const { t } = useTranslation("geo-comply");
  const router = useRouter();
  const [isWindowsLogoHovered, setIsWindowsLogoHovered] = useState(false);
  const [isAppleLogoHovered, setIsAppleLogoHovered] = useState(false);

  return (
    <>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={"Location Check Failed"}
        subTitle={
          <p>
            We have detected that you are attempting to wager from outside the
            State of New Jersey. This conduct is in violation of New Jersey
            state law N.J.S.A 5:12-95.23a. You should immediately cease and
            desist from attempting to wager from outside New Jersey. We have
            retained your user information and future attempts could result in
            an enforcement action.
          </p>
        }
        okText={t("OK")}
        onOk={() => dispatch(setIsGeocomplyLocationFailed(false))}
        isVisible={!!isGeocomplyLocationFailed}
      />
      <ResultModalComponent
        status={StatusEnum.GEOCOMPLY}
        title={"Geocomply Required"}
        subTitle={
          <>
            <a href="https://ums.geocomply.com/installer/url/?version=3.1.1.3&os=win&id=pwx5OPfLhV">
              <DownloadButton
                onMouseEnter={() => setIsWindowsLogoHovered(true)}
                onMouseLeave={() => setIsWindowsLogoHovered(false)}
              >
                <img
                  src={
                    isWindowsLogoHovered
                      ? "/images/windows_logo_hover.svg"
                      : "/images/windows_logo.svg"
                  }
                />
                <VerticalDivider />
                {t("DOWNLOAD_FOR_WINDOWS")}
              </DownloadButton>
            </a>
            <a href="https://ums.geocomply.com/installer/url/?version=3.1.1.3&os=mac&id=pwx5OPfLhV">
              <DownloadButton
                onMouseEnter={() => setIsAppleLogoHovered(true)}
                onMouseLeave={() => setIsAppleLogoHovered(false)}
              >
                <img
                  src={
                    isAppleLogoHovered
                      ? "/images/apple_logo_hover.svg"
                      : "/images/apple_logo.svg"
                  }
                />
                <VerticalDivider />
                {t("DOWNLOAD_FOR_MAC")}
              </DownloadButton>
            </a>
          </>
        }
        okText={t("I_HAVE_INSTALLED_GEOCOMPLY")}
        cancelText={t("DISMISS")}
        onCancel={() => dispatch(setIsGeocomplyRequired(false))}
        onOk={() => router?.reload()}
        isVisible={!!isGeocomplyRequired}
      />
    </>
  );
};

export { GeoComplyError };
