import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { appSlice, reportsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { ReportType } from "@idefix-backoffice/idefix/types";
import { REPORT_TYPE_KEYS } from "./helpers";

export const useReports = () => {
  const dispatch = useAppDispatch();
  const { reportType } = useParams<{ reportType: ReportType }>(); // TODO: use search params instead redux to store values
  const navigate = useNavigate();
  const brands = useAppSelector(appSlice.getBrands);
  const values = useAppSelector(reportsSlice.getValues);
  const reports = useAppSelector(reportsSlice.getReports);
  const isLoading = useAppSelector(reportsSlice.getIsLoading);
  const paymentProviders = useAppSelector(appSlice.getPaymentProviders);

  const handleSelectType = useCallback(
    (reportType: ReportType) => {
      if (!reportType) {
        navigate(`/reports`);
      }

      if (REPORT_TYPE_KEYS.includes(reportType)) {
        navigate(`/reports/${reportType}`);
        dispatch(reportsSlice.resetValuesAndReport());
        dispatch(reportsSlice.fetchReport({ reportType }));
      }
    },
    [dispatch, navigate]
  );

  const handleChangeValue = useCallback(
    (key: string, value: string) => {
      if (!reportType) return;

      if (key === "brandId" && value === "all") {
        dispatch(reportsSlice.changeValue(key, undefined, reportType));
      } else {
        dispatch(reportsSlice.changeValue(key, value, reportType));
      }
    },
    [dispatch, reportType]
  );

  const handleSelectBrand = useCallback(
    (brandId: string) => handleChangeValue("brandId", brandId),
    [handleChangeValue]
  );

  const handleFetchMoreData = useCallback(
    (pageSize?: number, text?: string) => {
      if (reportType) dispatch(reportsSlice.fetchReport({ reportType, values, pageSize, text }));
    },
    [dispatch, reportType, values]
  );

  useEffect(() => {
    if (reportType && REPORT_TYPE_KEYS.includes(reportType)) {
      dispatch(reportsSlice.fetchReport({ reportType, values }));
    }
  }, [dispatch, reportType, values]);

  return {
    brands,
    reportType,
    reports,
    values,
    isLoading,
    paymentProviders,
    handleSelectType,
    handleChangeValue,
    handleSelectBrand,
    handleFetchMoreData
  };
};
