import * as React from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import { ConfirmDialogProvider, Toast } from "../../components";
import { AppDispatch } from "../../redux";
import Drawers from "../drawers";
import { fetchBrandSettings } from "./brandSettingsSlice";
import { Header } from "./Header";
import { fetchSettings } from "./settingsSlice";

interface Params {
  brandId: string;
}

interface Props {
  children: React.ReactNode;
}

export const App: React.FC<Props> = ({ children }) => {
  const { brandId } = useParams<Params>();
  const dispatch: AppDispatch = useDispatch();

  React.useEffect(() => {
    dispatch(fetchBrandSettings(brandId));
  }, [brandId, dispatch]);

  React.useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  return (
    <ConfirmDialogProvider>
      <Header />
      <Toast />
      <Drawers />
      {children}
    </ConfirmDialogProvider>
  );
};
