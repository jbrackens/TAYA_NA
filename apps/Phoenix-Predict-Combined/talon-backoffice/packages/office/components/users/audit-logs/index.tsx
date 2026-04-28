import React from "react";
import { TalonAuditLogs } from "../../../types/logs";
import { TablePagination } from "../../../types/filters";
import AuditLogsList from "../../audit-logs";

type PunterAuditLogsListProps = {
  data: TalonAuditLogs;
  pagination: {} | TablePagination;
  isLoading: boolean | undefined;
  handleTableChange: any;
};

const PunterAuditLogsList = ({
  data,
  pagination,
  isLoading,
  handleTableChange,
}: PunterAuditLogsListProps) => (
  <AuditLogsList
    data={data}
    pagination={pagination}
    scrollable={true}
    isLoading={isLoading}
    handleTableChange={handleTableChange}
  />
);

export default PunterAuditLogsList;
