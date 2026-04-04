import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { Method, PunterRoleEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import PageHeader from "../../components/layout/page-header";
import Table from "../../components/layout/table";
import TableActions from "../../components/layout/table/actions";
import { useApi } from "../../services/api/api-service";
import { resolveToken, validateAndCheckEligibility } from "../../utils/auth";

type FixedExoticQuote = {
  quoteId: string;
  userId: string;
  exoticType: string;
  status: string;
  encodedTicket?: string;
  combinedOdds?: number;
  stakeCents?: number;
  acceptedBetId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

type FixedExoticListPayload = {
  items?: FixedExoticQuote[];
};

type AuditLogEntry = {
  id?: string;
  action?: string;
  actorId?: string;
  targetId?: string;
  occurredAt?: string;
  createdAt?: string;
  details?: string;
};

type AuditLogListPayload = {
  items?: AuditLogEntry[];
};

const resolveStatusColor = (status: string): string => {
  switch (`${status || ""}`.toLowerCase()) {
    case "open":
      return "processing";
    case "accepted":
      return "success";
    case "expired":
      return "default";
    default:
      return "default";
  }
};

const FixedExoticsContainer = () => {
  const { t } = useTranslation("page-fixed-exotics");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    userId: "",
    status: "",
  });
  const [items, setItems] = useState<FixedExoticQuote[]>([]);
  const [opsItems, setOpsItems] = useState<FixedExoticQuote[]>([]);
  const [recentExpireLogs, setRecentExpireLogs] = useState<AuditLogEntry[]>([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<FixedExoticQuote | null>(
    null,
  );
  const [expireVisible, setExpireVisible] = useState(false);
  const [expireQuoteId, setExpireQuoteId] = useState("");
  const [expireReason, setExpireReason] = useState("");

  const canExpireQuotes = useMemo(() => {
    const token = resolveToken();
    return validateAndCheckEligibility(token, [PunterRoleEnum.ADMIN]);
  }, []);

  const [triggerList, listLoading, listResponse] = useApi<FixedExoticListPayload>(
    "admin/exotics/fixed/quotes",
    Method.GET,
  );
  const [triggerOpsList, opsLoading, opsResponse] = useApi<FixedExoticListPayload>(
    "admin/exotics/fixed/quotes",
    Method.GET,
  );
  const [triggerAuditLogsList, auditLogsLoading, auditLogsResponse] =
    useApi<AuditLogListPayload>("admin/audit-logs", Method.GET);
  const [triggerDetails, detailsLoading, detailsResponse] =
    useApi<FixedExoticQuote>("admin/exotics/fixed/quotes/:id", Method.GET);
  const [triggerExpire, expireLoading] = useApi(
    "admin/exotics/fixed/quotes/:id/lifecycle/expire",
    Method.POST,
  );

  const fetchList = useCallback(
    async (filters = appliedFilters) => {
      const userId = `${filters.userId || ""}`.trim();
      const status = `${filters.status || ""}`.trim();
      await triggerList(undefined, {
        query: {
          ...(userId ? { userId } : {}),
          ...(status ? { status } : {}),
          limit: 200,
        },
      });
    },
    [triggerList, appliedFilters],
  );

  const fetchOperationalSnapshot = useCallback(async () => {
    await Promise.all([
      triggerOpsList(undefined, {
        query: {
          limit: 1000,
        },
      }),
      triggerAuditLogsList(undefined, {
        query: {
          action: "fixed_exotic.quote.expired",
          page: 1,
          pageSize: 5,
          sortBy: "occurredAt",
          sortDir: "desc",
        },
      }),
    ]);
  }, [triggerOpsList, triggerAuditLogsList]);

  useEffect(() => {
    void fetchList(appliedFilters);
  }, [appliedFilters, fetchList]);

  useEffect(() => {
    void fetchOperationalSnapshot();
  }, [fetchOperationalSnapshot]);

  useEffect(() => {
    if (!listResponse.succeeded) {
      return;
    }
    const payload = listResponse.data || {};
    setItems(Array.isArray(payload.items) ? payload.items : []);
  }, [listResponse.succeeded, listResponse.data]);

  useEffect(() => {
    if (!opsResponse.succeeded) {
      return;
    }
    const payload = opsResponse.data || {};
    setOpsItems(Array.isArray(payload.items) ? payload.items : []);
  }, [opsResponse.succeeded, opsResponse.data]);

  useEffect(() => {
    if (!auditLogsResponse.succeeded) {
      return;
    }
    const payload = auditLogsResponse.data || {};
    setRecentExpireLogs(Array.isArray(payload.items) ? payload.items : []);
  }, [auditLogsResponse.succeeded, auditLogsResponse.data]);

  useEffect(() => {
    if (!detailsResponse.succeeded || !detailsResponse.data) {
      return;
    }
    setDetailsRecord(detailsResponse.data);
    setDetailsVisible(true);
  }, [detailsResponse.succeeded, detailsResponse.data]);

  const applyFilters = () => {
    setAppliedFilters({
      userId: userIdFilter,
      status: statusFilter,
    });
  };

  const resetFilters = () => {
    setUserIdFilter("");
    setStatusFilter("");
    setAppliedFilters({
      userId: "",
      status: "",
    });
  };

  const openDetails = async (quoteId: string) => {
    await triggerDetails(undefined, { id: quoteId });
  };

  const openExpire = (quoteId: string) => {
    setExpireQuoteId(quoteId);
    setExpireReason("");
    setExpireVisible(true);
  };

  const submitExpire = async () => {
    const quoteId = `${expireQuoteId || ""}`.trim();
    if (!quoteId) {
      return;
    }
    await triggerExpire(
      {
        reason: `${expireReason || ""}`.trim() || "manual operator expire",
      },
      { id: quoteId },
    );
    setExpireVisible(false);
    setExpireQuoteId("");
    setExpireReason("");
    await fetchList(appliedFilters);
    await fetchOperationalSnapshot();
  };

  const statusCounts = useMemo(() => {
    const counts = {
      total: opsItems.length,
      open: 0,
      accepted: 0,
      expired: 0,
    };
    opsItems.forEach((quote) => {
      switch (`${quote.status || ""}`.toLowerCase()) {
        case "open":
          counts.open += 1;
          break;
        case "accepted":
          counts.accepted += 1;
          break;
        case "expired":
          counts.expired += 1;
          break;
        default:
          break;
      }
    });
    return counts;
  }, [opsItems]);

  const auditLogHref = "/logs?action=fixed_exotic.quote.expired&p=1&limit=20";

  const columns = useMemo(
    () => [
      {
        title: t("HEADER_QUOTE_ID"),
        dataIndex: "quoteId",
      },
      {
        title: t("HEADER_USER_ID"),
        dataIndex: "userId",
      },
      {
        title: t("HEADER_EXOTIC_TYPE"),
        dataIndex: "exoticType",
      },
      {
        title: t("HEADER_STATUS"),
        dataIndex: "status",
        render: (status: string) => (
          <Tag color={resolveStatusColor(status)}>{`${status || "-"}`}</Tag>
        ),
      },
      {
        title: t("HEADER_TICKET"),
        dataIndex: "encodedTicket",
        render: (encodedTicket: string) => encodedTicket || "-",
      },
      {
        title: t("HEADER_COMBINED_ODDS"),
        dataIndex: "combinedOdds",
        render: (value: number) =>
          typeof value === "number" ? value.toFixed(2) : "-",
      },
      {
        title: t("HEADER_STAKE_CENTS"),
        dataIndex: "stakeCents",
        render: (value: number) => (typeof value === "number" ? value : "-"),
      },
      {
        title: t("HEADER_ACCEPTED_BET_ID"),
        dataIndex: "acceptedBetId",
        render: (value: string) => value || "-",
      },
      {
        title: t("HEADER_UPDATED_AT"),
        render: (record: FixedExoticQuote) =>
          record.updatedAt || record.createdAt || "-",
      },
      {
        title: t("HEADER_LAST_REASON"),
        dataIndex: "lastReason",
        render: (value: string) => value || "-",
      },
      {
        title: <TableActions>{t("HEADER_ACTIONS")}</TableActions>,
        width: 180,
        render: (record: FixedExoticQuote) => {
          const status = `${record.status || ""}`.toLowerCase();
          const canExpire = status === "open" && canExpireQuotes;
          return (
            <TableActions>
              <Space size="small">
                <Button
                  size="small"
                  onClick={() => openDetails(record.quoteId)}
                  loading={detailsLoading}
                >
                  {t("ACTION_VIEW")}
                </Button>
                <Button
                  size="small"
                  danger
                  disabled={!canExpire}
                  title={!canExpireQuotes ? t("EXPIRE_DISABLED_ADMIN_ONLY") : ""}
                  loading={expireLoading && expireQuoteId === record.quoteId}
                  onClick={() => openExpire(record.quoteId)}
                >
                  {t("ACTION_EXPIRE")}
                </Button>
              </Space>
            </TableActions>
          );
        },
      },
    ],
    [canExpireQuotes, detailsLoading, expireLoading, expireQuoteId, t],
  );

  return (
    <>
      <PageHeader title={t("HEADER")} backIcon={false} />
      <Card
        title={t("OPS_CARD_TITLE")}
        style={{ marginBottom: 16 }}
        loading={opsLoading || auditLogsLoading}
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Typography.Text type="secondary">
              {t("OPS_COUNT_TOTAL")}
            </Typography.Text>
            <div>
              <Typography.Title level={3} style={{ marginBottom: 0 }}>
                {statusCounts.total}
              </Typography.Title>
            </div>
          </Col>
          <Col span={6}>
            <Typography.Text type="secondary">
              {t("OPS_COUNT_OPEN")}
            </Typography.Text>
            <div>
              <Typography.Title level={3} style={{ marginBottom: 0 }}>
                {statusCounts.open}
              </Typography.Title>
            </div>
          </Col>
          <Col span={6}>
            <Typography.Text type="secondary">
              {t("OPS_COUNT_ACCEPTED")}
            </Typography.Text>
            <div>
              <Typography.Title level={3} style={{ marginBottom: 0 }}>
                {statusCounts.accepted}
              </Typography.Title>
            </div>
          </Col>
          <Col span={6}>
            <Typography.Text type="secondary">
              {t("OPS_COUNT_EXPIRED")}
            </Typography.Text>
            <div>
              <Typography.Title level={3} style={{ marginBottom: 0 }}>
                {statusCounts.expired}
              </Typography.Title>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>{t("OPS_RECENT_EXPIRES_TITLE")}</Typography.Text>
          <List
            size="small"
            dataSource={recentExpireLogs}
            locale={{ emptyText: t("OPS_RECENT_EXPIRES_EMPTY") }}
            renderItem={(entry: AuditLogEntry) => {
              const targetId = entry.targetId || "-";
              const occurredAt = entry.occurredAt || entry.createdAt || "-";
              const details = `${entry.details || ""}`.trim();
              const actorLine = entry.actorId ? ` · ${entry.actorId}` : "";
              return (
                <List.Item key={`${entry.id || targetId}-${occurredAt}`}>
                  <Space direction="vertical" size={0}>
                    <Typography.Text>
                      <Typography.Text code>{targetId}</Typography.Text>
                      {actorLine}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {occurredAt}
                    </Typography.Text>
                    {details && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {details}
                      </Typography.Text>
                    )}
                  </Space>
                </List.Item>
              );
            }}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          {canExpireQuotes ? (
            <Button type="link" href={auditLogHref} style={{ paddingLeft: 0 }}>
              {t("OPS_AUDIT_LOG_LINK")}
            </Button>
          ) : (
            <Typography.Text type="secondary">
              {t("OPS_AUDIT_LOG_LINK_ADMIN_ONLY")}
            </Typography.Text>
          )}
        </div>
      </Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder={t("FILTER_USER_ID")}
          value={userIdFilter}
          onChange={(event) => setUserIdFilter(event.target.value)}
          style={{ width: 220 }}
        />
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          style={{ width: 180 }}
        >
          <Select.Option value="">{t("STATUS_ALL")}</Select.Option>
          <Select.Option value="open">{t("STATUS_OPEN")}</Select.Option>
          <Select.Option value="accepted">{t("STATUS_ACCEPTED")}</Select.Option>
          <Select.Option value="expired">{t("STATUS_EXPIRED")}</Select.Option>
        </Select>
        <Button type="primary" onClick={applyFilters}>
          {t("FILTER_APPLY")}
        </Button>
        <Button onClick={resetFilters}>{t("FILTER_RESET")}</Button>
      </Space>
      {!canExpireQuotes && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="warning">{t("READ_ONLY_WARNING")}</Tag>
        </div>
      )}

      <Table
        columns={columns}
        rowKey={(record: FixedExoticQuote) => record.quoteId}
        dataSource={items}
        loading={listLoading}
        pagination={false}
        locale={{
          emptyText: t("EMPTY"),
        }}
      />

      <Modal
        title={t("DETAILS_TITLE")}
        visible={detailsVisible}
        footer={[
          <Button key="close" onClick={() => setDetailsVisible(false)}>
            {t("CANCEL")}
          </Button>,
        ]}
        onCancel={() => setDetailsVisible(false)}
      >
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(detailsRecord || {}, null, 2)}
        </pre>
      </Modal>

      <Modal
        title={t("EXPIRE_TITLE")}
        visible={expireVisible}
        okText={t("EXPIRE_CONFIRM")}
        cancelText={t("CANCEL")}
        onCancel={() => setExpireVisible(false)}
        onOk={submitExpire}
        confirmLoading={expireLoading}
      >
        <Input.TextArea
          rows={4}
          placeholder={t("EXPIRE_REASON_PLACEHOLDER")}
          value={expireReason}
          onChange={(event) => setExpireReason(event.target.value)}
        />
      </Modal>
    </>
  );
};

export default FixedExoticsContainer;
