import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { Method, useTimezone } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import Table from "../../components/layout/table";
import { useApi } from "../../services/api/api-service";

type PaymentQueueItem = {
  transactionId: string;
  userId: string;
  type: string;
  status: string;
  amount: number | string;
  provider?: string;
  providerReference?: string;
  assignedTo?: string;
  timestamp: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
};

type PaymentQueueResponse = {
  data?: PaymentQueueItem[];
  pagination?: Pagination;
};

type PaymentSummaryItem = {
  provider?: string;
  type: string;
  status: string;
  assignedTo?: string;
  count: number;
  totalAmount: number | string;
  lastUpdatedAt?: string;
};

type PaymentSummaryResponse = {
  data?: PaymentSummaryItem[];
};

type PaymentDetails = {
  transactionId: string;
  status: string;
  direction: string;
  amount: number | string;
  currency: string;
  paymentMethod?: string;
  provider?: string;
  providerReference?: string;
  reference?: string;
  providerUpdatedAt?: string;
  assignedTo?: string;
  assignedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
};

type PaymentEvent = {
  id: string;
  transactionId: string;
  status: string;
  source: string;
  reason?: string;
  provider?: string;
  providerReference?: string;
  payload?: Record<string, any>;
  createdAt: string;
};

type PaymentEventListResponse = {
  data?: PaymentEvent[];
};

type PaymentAssignmentRequest = {
  assigned_to: string;
  reason?: string;
};

type PaymentActionRequest = {
  provider_reference?: string;
  reason?: string;
};

type CashierActionType =
  | "approve"
  | "decline"
  | "retry"
  | "settle"
  | "refund"
  | "reverse"
  | "chargeback";

type PendingCashierAction = {
  type: CashierActionType;
  transactionId: string;
};

const REASON_REQUIRED_ACTIONS: CashierActionType[] = [
  "decline",
  "refund",
  "reverse",
  "chargeback",
];

/**
 * State-aware gating: each cashier action is only valid for specific
 * transaction statuses. This prevents operators from triggering actions
 * that make no sense for the current payment state (e.g. approving an
 * already-succeeded transaction or refunding a pending one).
 */
const ALLOWED_ACTIONS_BY_STATUS: Record<string, CashierActionType[]> = {
  pending: ["decline", "settle"],
  pending_review: ["approve", "decline"],
  pending_approval: ["approve", "decline"],
  processing: ["settle", "reverse"],
  retrying: ["decline"],
  succeeded: ["refund", "reverse", "chargeback"],
  failed: ["retry"],
  declined: ["retry"],
  // Terminal states — no actions allowed
  reversed: [],
  refunded: [],
  chargeback: [],
  cancelled: [],
};

const isActionAllowed = (
  status: string | undefined,
  action: CashierActionType,
): boolean => {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  const allowed = ALLOWED_ACTIONS_BY_STATUS[normalized];
  // If status is unknown, block all actions (safe default)
  if (!allowed) return false;
  return allowed.includes(action);
};

const CASHIER_ACTION_CONFIRM_KEYS: Record<CashierActionType, string> = {
  approve: "CASHIER_CONFIRM_APPROVE",
  decline: "CASHIER_CONFIRM_DECLINE",
  retry: "CASHIER_CONFIRM_RETRY",
  settle: "CASHIER_CONFIRM_SETTLE",
  refund: "CASHIER_CONFIRM_REFUND",
  reverse: "CASHIER_CONFIRM_REVERSE",
  chargeback: "CASHIER_CONFIRM_CHARGEBACK",
};

const CASHIER_ACTION_SUCCESS_KEYS: Record<CashierActionType, string> = {
  approve: "CASHIER_SUCCESS_APPROVE",
  decline: "CASHIER_SUCCESS_DECLINE",
  retry: "CASHIER_SUCCESS_RETRY",
  settle: "CASHIER_SUCCESS_SETTLE",
  refund: "CASHIER_SUCCESS_REFUND",
  reverse: "CASHIER_SUCCESS_REVERSE",
  chargeback: "CASHIER_SUCCESS_CHARGEBACK",
};

type PaymentReconciliationRequest = {
  merchantTransactionId?: string;
  providerReference?: string;
  state: string;
  paymentMethod?: string;
  reason?: string;
};

type PaymentReconciliationPreview = {
  transactionId: string;
  provider?: string;
  providerReference?: string;
  direction: string;
  currentStatus: string;
  requestedStatus: string;
  normalizedStatus: string;
  action: string;
  allowed: boolean;
  blockingReason?: string;
  currentBalance: number | string;
  projectedBalance: number | string;
  reservationId?: string;
  requiresReservation: boolean;
  reservationSatisfied: boolean;
};

type PaymentNoteRequest = {
  reason: string;
};

type CashierFilters = {
  userId: string;
  type: string;
  status: string;
  provider: string;
  assignedTo: string;
};

type QueueState = {
  page: number;
  limit: number;
};

const DEFAULT_FILTERS: CashierFilters = {
  userId: "",
  type: "",
  status: "",
  provider: "",
  assignedTo: "",
};

const DEFAULT_QUEUE_STATE: QueueState = {
  page: 1,
  limit: 10,
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
};

const normalizeQueueResponse = (
  payload?: PaymentQueueResponse,
): { data: PaymentQueueItem[]; pagination: Pagination } => {
  const data = payload?.data;
  return {
    data: Array.isArray(data) ? data : [],
    pagination: payload?.pagination || DEFAULT_PAGINATION,
  };
};

const normalizeSummary = (payload?: PaymentSummaryResponse): PaymentSummaryItem[] => {
  const data = payload?.data;
  return Array.isArray(data) ? data : [];
};

const normalizeEvents = (payload?: PaymentEventListResponse): PaymentEvent[] => {
  const data = payload?.data;
  return Array.isArray(data) ? data : [];
};

const paymentStatusColor = (status: string): string => {
  const normalized = `${status || ""}`.trim().toLowerCase();
  switch (normalized) {
    case "succeeded":
    case "processing":
      return "success";
    case "pending":
    case "pending_review":
    case "pending_approval":
    case "retrying":
      return "processing";
    case "declined":
    case "failed":
    case "reversed":
    case "refunded":
    case "chargeback":
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const renderTimestamp = (
  value: string | undefined,
  format: string,
  getTimeWithTimezone: (value: any) => dayjs.Dayjs,
) => {
  if (!value) {
    return "-";
  }
  return getTimeWithTimezone(dayjs(value)).format(format);
};

const renderValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 180,
          overflow: "auto",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return `${value}`;
};

const CashierReviewPanel = () => {
  const { t } = useTranslation(["page-provider-ops", "common"]);
  const { getTimeWithTimezone } = useTimezone();
  const [filters, setFilters] = useState<CashierFilters>(DEFAULT_FILTERS);
  const [queueState, setQueueState] = useState<QueueState>(DEFAULT_QUEUE_STATE);
  const [reconciliationState, setReconciliationState] =
    useState<QueueState>(DEFAULT_QUEUE_STATE);
  const [paymentQueue, setPaymentQueue] = useState<PaymentQueueItem[]>([]);
  const [paymentQueuePagination, setPaymentQueuePagination] =
    useState<Pagination>(DEFAULT_PAGINATION);
  const [reconciliationQueue, setReconciliationQueue] = useState<PaymentQueueItem[]>([]);
  const [reconciliationPagination, setReconciliationPagination] =
    useState<Pagination>(DEFAULT_PAGINATION);
  const [summary, setSummary] = useState<PaymentSummaryItem[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentDetails | null>(
    null,
  );
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [actionProviderReference, setActionProviderReference] = useState("");
  const [note, setNote] = useState("");
  const [reconciliationForm, setReconciliationForm] =
    useState<PaymentReconciliationRequest>({
      merchantTransactionId: "",
      providerReference: "",
      state: "",
      paymentMethod: "",
      reason: "",
    });
  const [reconciliationPreview, setReconciliationPreview] =
    useState<PaymentReconciliationPreview | null>(null);

  const [triggerQueue, queueLoading, queueResponse] = useApi<PaymentQueueResponse>(
    "admin/payments/transactions",
    Method.GET,
  );
  const [triggerQueueExport, queueExportLoading, queueExportResponse] = useApi<any>(
    "admin/payments/transactions/export",
    Method.GET,
  );
  const [triggerSummary, summaryLoading, summaryResponse] =
    useApi<PaymentSummaryResponse>("admin/payments/transactions/summary", Method.GET);
  const [triggerReconciliationQueue, reconciliationLoading, reconciliationResponse] =
    useApi<PaymentQueueResponse>(
      "admin/payments/transactions/reconciliation-queue",
      Method.GET,
    );
  const [triggerReconciliationQueueExport, reconciliationQueueExportLoading, reconciliationQueueExportResponse] =
    useApi<any>("admin/payments/transactions/reconciliation-queue/export", Method.GET);
  const [triggerReconciliationPreview, reconciliationPreviewLoading, reconciliationPreviewResponse] =
    useApi<PaymentReconciliationPreview, any, PaymentReconciliationRequest>(
      "admin/payments/transactions/reconcile/preview",
      Method.POST,
    );
  const [triggerReconcile, reconcileLoading] = useApi<
    PaymentDetails,
    any,
    PaymentReconciliationRequest
  >("admin/payments/transactions/reconcile", Method.POST);
  const [triggerDetail, detailLoading, detailResponse] = useApi<PaymentDetails>(
    "admin/payments/transactions/:transactionID",
    Method.GET,
  );
  const [triggerEvents, eventsLoading, eventsResponse] =
    useApi<PaymentEventListResponse>(
      "admin/payments/transactions/:transactionID/events",
      Method.GET,
    );
  const [triggerAssign, assignLoading] = useApi<PaymentDetails, any, PaymentAssignmentRequest>(
    "admin/payments/transactions/:transactionID/assign",
    Method.POST,
  );
  const [triggerAddNote, noteLoading] = useApi<
    PaymentEventListResponse,
    any,
    PaymentNoteRequest
  >("admin/payments/transactions/:transactionID/notes", Method.POST);
  const [triggerApprove, approveLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/approve", Method.POST);
  const [triggerDecline, declineLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/decline", Method.POST);
  const [triggerRetry, retryLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/retry", Method.POST);
  const [triggerSettle, settleLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/settle", Method.POST);
  const [triggerRefund, refundLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/refund", Method.POST);
  const [triggerReverse, reverseLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/reverse", Method.POST);
  const [triggerChargeback, chargebackLoading] = useApi<
    PaymentDetails,
    any,
    PaymentActionRequest
  >("admin/payments/transactions/:transactionID/chargeback", Method.POST);

  const actionLoading =
    assignLoading ||
    noteLoading ||
    approveLoading ||
    declineLoading ||
    retryLoading ||
    settleLoading ||
    refundLoading ||
    reverseLoading ||
    chargebackLoading ||
    reconcileLoading;

  const [pendingAction, setPendingAction] = useState<PendingCashierAction | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const actionTriggers: Record<
    CashierActionType,
    (body?: PaymentActionRequest, params?: Record<string, any>) => any
  > = useMemo(
    () => ({
      approve: triggerApprove,
      decline: triggerDecline,
      retry: triggerRetry,
      settle: triggerSettle,
      refund: triggerRefund,
      reverse: triggerReverse,
      chargeback: triggerChargeback,
    }),
    [triggerApprove, triggerDecline, triggerRetry, triggerSettle, triggerRefund, triggerReverse, triggerChargeback],
  );

  const requestAction = useCallback(
    (type: CashierActionType) => {
      if (!selectedTransactionId || actionLoading || confirmSubmitting) {
        return;
      }
      setPendingAction({ type, transactionId: selectedTransactionId });
      setConfirmReason("");
    },
    [selectedTransactionId, actionLoading, confirmSubmitting],
  );

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    setConfirmReason("");
    setConfirmSubmitting(false);
  }, []);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction) {
      return;
    }
    const isReasonRequired = REASON_REQUIRED_ACTIONS.includes(pendingAction.type);
    if (isReasonRequired && !confirmReason.trim()) {
      return;
    }
    setConfirmSubmitting(true);
    try {
      const trigger = actionTriggers[pendingAction.type];
      const payload: PaymentActionRequest = {
        ...(actionProviderReference.trim()
          ? { provider_reference: actionProviderReference.trim() }
          : {}),
        ...(confirmReason.trim() ? { reason: confirmReason.trim() } : {}),
      };
      await Promise.resolve(
        trigger(payload, { transactionID: pendingAction.transactionId }),
      );
      void message.success(t(CASHIER_ACTION_SUCCESS_KEYS[pendingAction.type]));
  
      cancelPendingAction();
      await Promise.all([
        refreshAll(),
        refreshSelectedTransaction(pendingAction.transactionId),
      ]);
    } finally {
      setConfirmSubmitting(false);
    }
  }, [
    pendingAction,
    confirmReason,
    actionTriggers,
    actionProviderReference,
    cancelPendingAction,
    t,
  ]);

  const downloadCSV = (content: any, filename: string) => {
    const url = window.URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const refreshQueue = async (page = queueState.page, limit = queueState.limit) => {
    await triggerQueue(undefined, {
      query: {
        ...(filters.userId ? { user_id: filters.userId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.provider ? { provider: filters.provider } : {}),
        ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
        page,
        limit,
      },
    });
  };

  const refreshSummary = async () => {
    await triggerSummary(undefined, {
      query: {
        ...(filters.userId ? { user_id: filters.userId } : {}),
        ...(filters.provider ? { provider: filters.provider } : {}),
        ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
      },
    });
  };

  const refreshReconciliationQueue = async (
    page = reconciliationState.page,
    limit = reconciliationState.limit,
  ) => {
    await triggerReconciliationQueue(undefined, {
      query: {
        ...(filters.userId ? { user_id: filters.userId } : {}),
        ...(filters.provider ? { provider: filters.provider } : {}),
        ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
        page,
        limit,
      },
    });
  };

  const buildQueueFilterQuery = () => ({
    ...(filters.userId ? { user_id: filters.userId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
  });

  const buildReconciliationFilterQuery = () => ({
    ...(filters.userId ? { user_id: filters.userId } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
  });

  const refreshSelectedTransaction = async (transactionID: string) => {
    if (!transactionID) {
      return;
    }
    await Promise.all([
      triggerDetail(undefined, { transactionID }),
      triggerEvents(undefined, { transactionID }),
    ]);
  };

  useEffect(() => {
    void Promise.all([refreshQueue(), refreshSummary(), refreshReconciliationQueue()]);
  }, [
    filters.userId,
    filters.type,
    filters.status,
    filters.provider,
    filters.assignedTo,
    queueState.page,
    queueState.limit,
    reconciliationState.page,
    reconciliationState.limit,
  ]);

  useEffect(() => {
    const normalized = normalizeQueueResponse(queueResponse.data);
    setPaymentQueue(normalized.data);
    setPaymentQueuePagination(normalized.pagination);
  }, [queueResponse.data]);

  useEffect(() => {
    setSummary(normalizeSummary(summaryResponse.data));
  }, [summaryResponse.data]);

  useEffect(() => {
    const normalized = normalizeQueueResponse(reconciliationResponse.data);
    setReconciliationQueue(normalized.data);
    setReconciliationPagination(normalized.pagination);
  }, [reconciliationResponse.data]);

  useEffect(() => {
    if (!queueExportResponse.succeeded) {
      return;
    }
    downloadCSV(queueExportResponse.data, "cashier-queue.csv");
  }, [queueExportResponse.succeeded, queueExportResponse.data]);

  useEffect(() => {
    if (!reconciliationQueueExportResponse.succeeded) {
      return;
    }
    downloadCSV(
      reconciliationQueueExportResponse.data,
      "cashier-reconciliation-queue.csv",
    );
  }, [
    reconciliationQueueExportResponse.succeeded,
    reconciliationQueueExportResponse.data,
  ]);

  useEffect(() => {
    if (!reconciliationPreviewResponse.succeeded || !reconciliationPreviewResponse.data) {
      return;
    }
    setReconciliationPreview(reconciliationPreviewResponse.data);
  }, [
    reconciliationPreviewResponse.succeeded,
    reconciliationPreviewResponse.data,
  ]);

  useEffect(() => {
    if (!detailResponse.succeeded || !detailResponse.data) {
      return;
    }
    setSelectedTransaction(detailResponse.data);
    setAssignTo(detailResponse.data.assignedTo || "");
    setActionProviderReference(detailResponse.data.providerReference || "");
  }, [detailResponse.succeeded, detailResponse.data]);

  useEffect(() => {
    if (!eventsResponse.succeeded) {
      return;
    }
    setEvents(normalizeEvents(eventsResponse.data));
  }, [eventsResponse.succeeded, eventsResponse.data]);

  const openTransaction = async (record: PaymentQueueItem) => {
    setDrawerVisible(true);
    setSelectedTransactionId(record.transactionId);
    setSelectedTransaction(null);
    setEvents([]);
    setAssignTo(record.assignedTo || "");
    setAssignReason("");

    setActionProviderReference(record.providerReference || "");
    setNote("");
    await refreshSelectedTransaction(record.transactionId);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSelectedTransactionId("");
    setSelectedTransaction(null);
    setEvents([]);
    setAssignTo("");
    setAssignReason("");

    setActionProviderReference("");
    setNote("");
    cancelPendingAction();
  };

  const refreshAll = async () => {
    await Promise.all([
      refreshQueue(queueState.page, queueState.limit),
      refreshSummary(),
      refreshReconciliationQueue(reconciliationState.page, reconciliationState.limit),
    ]);
  };

  const submitQueueExport = async () => {
    await triggerQueueExport(undefined, {
      query: buildQueueFilterQuery(),
    });
  };

  const submitReconciliationQueueExport = async () => {
    await triggerReconciliationQueueExport(undefined, {
      query: buildReconciliationFilterQuery(),
    });
  };

  const submitAssignment = async () => {
    if (!selectedTransactionId || !`${assignTo || ""}`.trim()) {
      return;
    }
    await triggerAssign(
      {
        assigned_to: assignTo.trim(),
        ...(assignReason.trim() ? { reason: assignReason.trim() } : {}),
      },
      { transactionID: selectedTransactionId },
    );
    setAssignReason("");
    await Promise.all([refreshAll(), refreshSelectedTransaction(selectedTransactionId)]);
  };

  const submitNote = async () => {
    if (!selectedTransactionId || !`${note || ""}`.trim()) {
      return;
    }
    await triggerAddNote(
      { reason: note.trim() },
      { transactionID: selectedTransactionId },
    );
    setNote("");
    await Promise.all([refreshAll(), refreshSelectedTransaction(selectedTransactionId)]);
  };

  const canRunReconciliation =
    !!`${reconciliationForm.state || ""}`.trim() &&
    (!!`${reconciliationForm.merchantTransactionId || ""}`.trim() ||
      !!`${reconciliationForm.providerReference || ""}`.trim());

  const submitReconciliationPreview = async () => {
    if (!canRunReconciliation) {
      return;
    }
    await triggerReconciliationPreview(reconciliationForm);
  };

  const submitReconcile = async () => {
    if (!canRunReconciliation) {
      return;
    }
    const transactionID = reconciliationPreview?.transactionId || "";
    await Promise.resolve(triggerReconcile(reconciliationForm));
    setReconciliationPreview(null);
    await refreshAll();
    if (transactionID) {
      setDrawerVisible(true);
      setSelectedTransactionId(transactionID);
      await refreshSelectedTransaction(transactionID);
    }
  };

  const summaryCounts = useMemo(() => {
    return summary.reduce(
      (acc, item) => {
        acc.groups += 1;
        acc.transactions += item.count || 0;
        return acc;
      },
      { groups: 0, transactions: 0 },
    );
  }, [summary]);

  const queueColumns = [
    {
      title: t("CASHIER_HEADER_TRANSACTION"),
      dataIndex: "transactionId",
      key: "transactionId",
      ellipsis: true,
    },
    {
      title: t("CASHIER_HEADER_USER"),
      dataIndex: "userId",
      key: "userId",
      ellipsis: true,
    },
    {
      title: t("CASHIER_HEADER_TYPE"),
      dataIndex: "type",
      key: "type",
      render: (value: string) => (value || "-").toUpperCase(),
    },
    {
      title: t("CASHIER_HEADER_STATUS"),
      dataIndex: "status",
      key: "status",
      render: (value: string) => <Tag color={paymentStatusColor(value)}>{value || "-"}</Tag>,
    },
    {
      title: t("CASHIER_HEADER_PROVIDER"),
      dataIndex: "provider",
      key: "provider",
      render: (value: string) => value || "-",
    },
    {
      title: t("CASHIER_HEADER_ASSIGNED"),
      dataIndex: "assignedTo",
      key: "assignedTo",
      render: (value: string) => value || t("CASHIER_UNASSIGNED"),
    },
    {
      title: t("CASHIER_HEADER_AMOUNT"),
      dataIndex: "amount",
      key: "amount",
      render: (value: number | string) => `${value}`,
    },
    {
      title: t("CASHIER_HEADER_UPDATED"),
      dataIndex: "timestamp",
      key: "timestamp",
      render: (value: string) =>
        renderTimestamp(value, t("common:DATE_TIME_FORMAT"), getTimeWithTimezone),
    },
    {
      title: t("CASHIER_HEADER_ACTIONS"),
      key: "actions",
      render: (_: unknown, record: PaymentQueueItem) => (
        <Button size="small" onClick={() => void openTransaction(record)}>
          {t("CASHIER_ACTION_OPEN")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card title={t("CASHIER_QUEUE_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={5}>
            <Input
              value={filters.userId}
              onChange={(event) => {
                setQueueState(DEFAULT_QUEUE_STATE);
                setReconciliationState(DEFAULT_QUEUE_STATE);
                setFilters((previous) => ({
                  ...previous,
                  userId: event.target.value,
                }));
              }}
              placeholder={t("CASHIER_FILTER_USER")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={filters.type}
              onChange={(event) => {
                setQueueState(DEFAULT_QUEUE_STATE);
                setFilters((previous) => ({
                  ...previous,
                  type: event.target.value,
                }));
              }}
              placeholder={t("CASHIER_FILTER_TYPE")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={filters.status}
              onChange={(event) => {
                setQueueState(DEFAULT_QUEUE_STATE);
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value,
                }));
              }}
              placeholder={t("CASHIER_FILTER_STATUS")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={filters.provider}
              onChange={(event) => {
                setQueueState(DEFAULT_QUEUE_STATE);
                setReconciliationState(DEFAULT_QUEUE_STATE);
                setFilters((previous) => ({
                  ...previous,
                  provider: event.target.value,
                }));
              }}
              placeholder={t("CASHIER_FILTER_PROVIDER")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={filters.assignedTo}
              onChange={(event) => {
                setQueueState(DEFAULT_QUEUE_STATE);
                setReconciliationState(DEFAULT_QUEUE_STATE);
                setFilters((previous) => ({
                  ...previous,
                  assignedTo: event.target.value,
                }));
              }}
              placeholder={t("CASHIER_FILTER_ASSIGNED")}
            />
          </Col>
          <Col xs={24} md={3}>
            <Space>
              <Button type="primary" onClick={() => void refreshAll()}>
                {t("CASHIER_ACTION_REFRESH")}
              </Button>
              <Button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setQueueState(DEFAULT_QUEUE_STATE);
                  setReconciliationState(DEFAULT_QUEUE_STATE);
                }}
              >
                {t("CASHIER_ACTION_RESET")}
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={24}>
            <Space wrap>
              <Button
                onClick={() => void submitQueueExport()}
                loading={queueExportLoading}
              >
                {t("CASHIER_ACTION_EXPORT_QUEUE")}
              </Button>
              <Button
                onClick={() => void submitReconciliationQueueExport()}
                loading={reconciliationQueueExportLoading}
              >
                {t("CASHIER_ACTION_EXPORT_RECONCILIATION")}
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={summaryLoading}>
              <Typography.Text type="secondary">
                {t("CASHIER_METRIC_QUEUE_ITEMS")}
              </Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {paymentQueuePagination.total || paymentQueue.length}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={summaryLoading}>
              <Typography.Text type="secondary">
                {t("CASHIER_METRIC_RECONCILIATION_ITEMS")}
              </Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {reconciliationPagination.total || reconciliationQueue.length}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={summaryLoading}>
              <Typography.Text type="secondary">
                {t("CASHIER_METRIC_SUMMARY_GROUPS")}
              </Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {summaryCounts.groups}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={summaryLoading}>
              <Typography.Text type="secondary">
                {t("CASHIER_METRIC_SUMMARY_TRANSACTIONS")}
              </Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {summaryCounts.transactions}
              </Typography.Title>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title={t("CASHIER_SUMMARY_TITLE")} loading={summaryLoading}>
              {summary.length === 0 ? (
                <Empty description={t("CASHIER_SUMMARY_EMPTY")} />
              ) : (
                <List
                  size="small"
                  dataSource={summary}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: "100%" }}>
                        <Typography.Text>
                          {`${item.provider || t("CASHIER_UNSPECIFIED_PROVIDER")} / ${item.type} / ${item.status}`}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {`${t("CASHIER_HEADER_ASSIGNED")}: ${item.assignedTo || t("CASHIER_UNASSIGNED")}`}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {`${t("CASHIER_SUMMARY_COUNT")}: ${item.count} | ${t("CASHIER_SUMMARY_TOTAL")}: ${item.totalAmount}`}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title={t("CASHIER_RECONCILIATION_TITLE")} loading={reconciliationLoading}>
              <Table
                rowKey={(record: Record<string, any>) =>
                  `${record.transactionId}:${record.timestamp || ""}`
                }
                columns={queueColumns}
                dataSource={reconciliationQueue}
                pagination={{
                  current: reconciliationPagination.page || reconciliationState.page,
                  pageSize: reconciliationPagination.limit || reconciliationState.limit,
                  total: reconciliationPagination.total || reconciliationQueue.length,
                  pageSizeOptions: ["10", "20", "50"],
                  showSizeChanger: true,
                }}
                loading={reconciliationLoading}
                locale={{ emptyText: t("CASHIER_RECONCILIATION_EMPTY") }}
                onChange={(pagination: Record<string, any>) =>
                  setReconciliationState((previous) => ({
                    page: pagination.current || previous.page,
                    limit: pagination.pageSize || previous.limit,
                  }))
                }
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title={t("CASHIER_RECONCILIATION_WORKFLOW_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Input
              value={reconciliationForm.merchantTransactionId}
              onChange={(event) =>
                setReconciliationForm((previous) => ({
                  ...previous,
                  merchantTransactionId: event.target.value,
                }))
              }
              placeholder={t("CASHIER_FIELD_MERCHANT_TRANSACTION_ID")}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              value={reconciliationForm.providerReference}
              onChange={(event) =>
                setReconciliationForm((previous) => ({
                  ...previous,
                  providerReference: event.target.value,
                }))
              }
              placeholder={t("CASHIER_FIELD_PROVIDER_REFERENCE")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={reconciliationForm.state}
              onChange={(event) =>
                setReconciliationForm((previous) => ({
                  ...previous,
                  state: event.target.value,
                }))
              }
              placeholder={t("CASHIER_FIELD_RECONCILIATION_STATE")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={reconciliationForm.paymentMethod}
              onChange={(event) =>
                setReconciliationForm((previous) => ({
                  ...previous,
                  paymentMethod: event.target.value,
                }))
              }
              placeholder={t("CASHIER_FIELD_PAYMENT_METHOD")}
            />
          </Col>
          <Col xs={24} md={4}>
            <Input
              value={reconciliationForm.reason}
              onChange={(event) =>
                setReconciliationForm((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              placeholder={t("CASHIER_FIELD_ACTION_REASON")}
            />
          </Col>
          <Col span={24}>
            <Space wrap>
              <Button
                type="primary"
                onClick={() => void submitReconciliationPreview()}
                loading={reconciliationPreviewLoading}
                disabled={!canRunReconciliation}
              >
                {t("CASHIER_ACTION_PREVIEW_RECONCILIATION")}
              </Button>
              <Button
                onClick={() => void submitReconcile()}
                loading={actionLoading}
                disabled={!canRunReconciliation}
              >
                {t("CASHIER_ACTION_RECONCILE")}
              </Button>
            </Space>
          </Col>
          <Col span={24}>
            {reconciliationPreview ? (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_TRANSACTION")}>
                  {reconciliationPreview.transactionId}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_CURRENT_STATUS")}>
                  {reconciliationPreview.currentStatus}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_REQUESTED_STATUS")}>
                  {reconciliationPreview.requestedStatus}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_NORMALIZED_STATUS")}>
                  {reconciliationPreview.normalizedStatus}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_ACTION")}>
                  {reconciliationPreview.action}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_ALLOWED")}>
                  {reconciliationPreview.allowed ? t("VALUE_ENABLED") : t("VALUE_DISABLED")}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_BALANCE")}>
                  {`${reconciliationPreview.currentBalance} -> ${reconciliationPreview.projectedBalance}`}
                </Descriptions.Item>
                <Descriptions.Item label={t("CASHIER_RECON_PREVIEW_BLOCKING_REASON")}>
                  {reconciliationPreview.blockingReason || "-"}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description={t("CASHIER_RECONCILIATION_PREVIEW_EMPTY")} />
            )}
          </Col>
        </Row>
      </Card>

      <Card title={t("CASHIER_ALL_QUEUE_TITLE")} style={{ marginBottom: 16 }}>
        <Table
          rowKey={(record: Record<string, any>) =>
            `${record.transactionId}:${record.timestamp || ""}`
          }
          columns={queueColumns}
          dataSource={paymentQueue}
          pagination={{
            current: paymentQueuePagination.page || queueState.page,
            pageSize: paymentQueuePagination.limit || queueState.limit,
            total: paymentQueuePagination.total || paymentQueue.length,
            pageSizeOptions: ["10", "20", "50"],
            showSizeChanger: true,
          }}
          loading={queueLoading}
          locale={{ emptyText: t("CASHIER_QUEUE_EMPTY") }}
          onChange={(pagination: Record<string, any>) =>
            setQueueState((previous) => ({
              page: pagination.current || previous.page,
              limit: pagination.pageSize || previous.limit,
            }))
          }
        />
      </Card>

      <Drawer
        title={t("CASHIER_DETAIL_TITLE")}
        visible={drawerVisible}
        width={720}
        onClose={closeDrawer}
      >
        {selectedTransaction ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label={t("CASHIER_HEADER_TRANSACTION")}>
                {selectedTransaction.transactionId}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_STATUS")}>
                <Tag color={paymentStatusColor(selectedTransaction.status)}>
                  {selectedTransaction.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_TYPE")}>
                {selectedTransaction.direction || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_AMOUNT")}>
                {`${selectedTransaction.amount} ${selectedTransaction.currency || ""}`}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_PROVIDER")}>
                {selectedTransaction.provider || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_PROVIDER_REFERENCE")}>
                {selectedTransaction.providerReference || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_ASSIGNED")}>
                {selectedTransaction.assignedTo || t("CASHIER_UNASSIGNED")}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_CREATED") }>
                {renderTimestamp(
                  selectedTransaction.createdAt,
                  t("common:DATE_TIME_FORMAT"),
                  getTimeWithTimezone,
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_PROVIDER_UPDATED")}>
                {renderTimestamp(
                  selectedTransaction.providerUpdatedAt,
                  t("common:DATE_TIME_FORMAT"),
                  getTimeWithTimezone,
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("CASHIER_HEADER_METADATA")}>
                {renderValue(selectedTransaction.metadata)}
              </Descriptions.Item>
            </Descriptions>

            <Card title={t("CASHIER_ASSIGNMENT_TITLE")} size="small">
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Input
                    value={assignTo}
                    onChange={(event) => setAssignTo(event.target.value)}
                    placeholder={t("CASHIER_FIELD_ASSIGNED_TO")}
                  />
                </Col>
                <Col span={12}>
                  <Input
                    value={assignReason}
                    onChange={(event) => setAssignReason(event.target.value)}
                    placeholder={t("CASHIER_FIELD_ASSIGN_REASON")}
                  />
                </Col>
                <Col span={24}>
                  <Button
                    type="primary"
                    onClick={() => void submitAssignment()}
                    loading={assignLoading}
                    disabled={!`${assignTo || ""}`.trim()}
                  >
                    {t("CASHIER_ACTION_ASSIGN")}
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card title={t("CASHIER_ACTIONS_TITLE")} size="small">
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Input
                    value={actionProviderReference}
                    onChange={(event) => setActionProviderReference(event.target.value)}
                    placeholder={t("CASHIER_FIELD_PROVIDER_REFERENCE")}
                  />
                </Col>
                <Col span={24}>
                  <Space wrap>
                    <Button onClick={() => requestAction("approve")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "approve")}>
                      {t("CASHIER_ACTION_APPROVE")}
                    </Button>
                    <Button onClick={() => requestAction("decline")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "decline")} danger>
                      {t("CASHIER_ACTION_DECLINE")}
                    </Button>
                    <Button onClick={() => requestAction("retry")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "retry")}>
                      {t("CASHIER_ACTION_RETRY")}
                    </Button>
                    <Button onClick={() => requestAction("settle")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "settle")}>
                      {t("CASHIER_ACTION_SETTLE")}
                    </Button>
                    <Button onClick={() => requestAction("refund")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "refund")} danger>
                      {t("CASHIER_ACTION_REFUND")}
                    </Button>
                    <Button onClick={() => requestAction("reverse")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "reverse")} danger>
                      {t("CASHIER_ACTION_REVERSE")}
                    </Button>
                    <Button onClick={() => requestAction("chargeback")} disabled={actionLoading || confirmSubmitting || !isActionAllowed(selectedTransaction?.status, "chargeback")} danger>
                      {t("CASHIER_ACTION_CHARGEBACK")}
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Modal
              title={
                pendingAction
                  ? t(CASHIER_ACTION_CONFIRM_KEYS[pendingAction.type])
                  : ""
              }
              visible={!!pendingAction}
              onCancel={cancelPendingAction}
              onOk={() => void confirmPendingAction()}
              okText={t("CASHIER_CONFIRM_OK")}
              cancelText={t("CASHIER_CONFIRM_CANCEL")}
              confirmLoading={confirmSubmitting}
              okButtonProps={{
                disabled:
                  !!pendingAction &&
                  REASON_REQUIRED_ACTIONS.includes(pendingAction.type) &&
                  !confirmReason.trim(),
              }}
              destroyOnClose
            >
              {pendingAction && (
                <>
                  <Typography.Paragraph>
                    {t("CASHIER_CONFIRM_TRANSACTION_LABEL")}:{" "}
                    <Typography.Text strong>{pendingAction.transactionId}</Typography.Text>
                  </Typography.Paragraph>
                  <Input.TextArea
                    rows={3}
                    value={confirmReason}
                    onChange={(event) => setConfirmReason(event.target.value)}
                    placeholder={
                      REASON_REQUIRED_ACTIONS.includes(pendingAction.type)
                        ? t("CASHIER_CONFIRM_REASON_REQUIRED")
                        : t("CASHIER_CONFIRM_REASON_OPTIONAL")
                    }
                    data-testid="cashier-confirm-reason"
                  />
                  {REASON_REQUIRED_ACTIONS.includes(pendingAction.type) && !confirmReason.trim() && (
                    <Typography.Text type="danger" style={{ display: "block", marginTop: 4 }}>
                      {t("CASHIER_CONFIRM_REASON_REQUIRED_HINT")}
                    </Typography.Text>
                  )}
                </>
              )}
            </Modal>

            <Card title={t("CASHIER_NOTE_TITLE")} size="small">
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Input.TextArea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("CASHIER_FIELD_NOTE")}
                  />
                </Col>
                <Col span={24}>
                  <Button
                    type="primary"
                    onClick={() => void submitNote()}
                    loading={noteLoading}
                    disabled={!`${note || ""}`.trim()}
                  >
                    {t("CASHIER_ACTION_ADD_NOTE")}
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card title={t("CASHIER_EVENTS_TITLE")} size="small" loading={eventsLoading}>
              {events.length === 0 ? (
                <Empty description={t("CASHIER_EVENTS_EMPTY")} />
              ) : (
                <List
                  dataSource={events}
                  renderItem={(event) => (
                    <List.Item key={event.id}>
                      <Space direction="vertical" size={0} style={{ width: "100%" }}>
                        <Typography.Text strong>
                          {`${event.status} / ${event.source}`}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {renderTimestamp(
                            event.createdAt,
                            t("common:DATE_TIME_FORMAT"),
                            getTimeWithTimezone,
                          )}
                        </Typography.Text>
                        <Typography.Text>{event.reason || "-"}</Typography.Text>
                        {event.payload ? renderValue(event.payload) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        ) : detailLoading ? null : (
          <Empty description={t("CASHIER_QUEUE_EMPTY")} />
        )}
      </Drawer>
    </>
  );
};

export default CashierReviewPanel;
