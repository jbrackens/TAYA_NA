import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPaymentProviders } from "../app";
import { changeValue, fetchReport, getIsLoading, getReports, getValues, resetValuesAndReport } from "./reportsSlice";
import Component from "./Component";
import { ReportType } from "app/types";
import { useNavigate, useParams } from "react-router-dom";
import { REPORT_TYPE_KEYS } from "./helpers";
import { SortDirection } from "@material-ui/core";

const Container = () => {
  const dispatch = useDispatch();
  const { reportType } = useParams<{ reportType: ReportType }>();
  const navigate = useNavigate();
  const report = useSelector(getReports);
  const isLoading = useSelector(getIsLoading);
  const values = useSelector(getValues);
  const paymentProviders = useSelector(getPaymentProviders);

  useEffect(() => {
    if (reportType && REPORT_TYPE_KEYS.includes(reportType)) {
      dispatch(fetchReport({ reportType, values }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectType = useCallback(
    (reportType: ReportType | string) => {
      if (reportType === "") {
        navigate(`/reports`);
      }
      if (REPORT_TYPE_KEYS.includes(reportType)) {
        navigate(`/reports/${reportType}`);
        dispatch(resetValuesAndReport());
        // @ts-ignore
        dispatch(fetchReport({ reportType }));
      }
    },
    [dispatch, navigate],
  );

  const handleChangeValue = useCallback(
    (key, value) => {
      if (key === "brandId" && value === "all") {
        dispatch(changeValue(key, undefined, reportType!));
      } else {
        dispatch(changeValue(key, value, reportType!));
      }
    },
    [dispatch, reportType],
  );

  const handleSelectBrand = useCallback(
    (brandId: string) => handleChangeValue("brandId", brandId),
    [handleChangeValue],
  );

  const handleFetchMoreData = useCallback(
    (pageSize?: number, text?: string, sortBy?: string, sortDirection?: SortDirection) => {
      if (reportType) dispatch(fetchReport({ reportType, values, pageSize, text, sortBy, sortDirection }));
    },
    [dispatch, reportType, values],
  );

  return (
    <Component
      reportType={reportType as ReportType}
      values={values}
      report={report}
      paymentProviders={paymentProviders}
      onSelectType={handleSelectType}
      onChangeValue={handleChangeValue}
      onSelectBrand={handleSelectBrand}
      onFetchMoreData={handleFetchMoreData}
      isLoading={isLoading}
    />
  );
};

export default Container;
