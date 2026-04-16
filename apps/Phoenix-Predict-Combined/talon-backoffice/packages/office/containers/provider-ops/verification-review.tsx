import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  List,
  Row,
  Select,
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

type VerificationSession = {
  id: string;
  userId: string;
  flowType: string;
  provider: string;
  status: string;
  redirectUrl?: string;
  providerReference?: string;
  providerDecision?: string;
  providerCaseId?: string;
  lastErrorCode?: string;
  assignedTo?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type VerificationReviewQueueResponse = {
  data?: VerificationSession[];
};

type VerificationProviderEvent = {
  id: string;
  verificationSessionId: string;
  provider: string;
  status: string;
  source: string;
  reason?: string;
  payload?: Record<string, any>;
  createdAt: string;
};

type VerificationProviderEventListResponse = {
  data?: VerificationProviderEvent[];
};

type VerificationAssignmentRequest = {
  assignedTo: string;
  reason?: string;
};

type VerificationNoteRequest = {
  note: string;
};

type KBAQuestion = {
  questionId: string;
  text: string;
  choices: string[];
};

type VerificationDecisionRequest = {
  decision: string;
  reason?: string;
  questions?: KBAQuestion[];
};

type VerificationDecisionOption = "approved" | "rejected" | "manual_review" | "questions";

const DECISION_OPTIONS: { value: VerificationDecisionOption; labelKey: string }[] = [
  { value: "approved", labelKey: "VERIFICATION_DECISION_APPROVED" },
  { value: "rejected", labelKey: "VERIFICATION_DECISION_REJECTED" },
  { value: "manual_review", labelKey: "VERIFICATION_DECISION_MANUAL_REVIEW" },
  { value: "questions", labelKey: "VERIFICATION_DECISION_QUESTIONS" },
];

type VerificationFilters = {
  assignedTo: string;
  flowType: string;
  status: string;
};

const DEFAULT_FILTERS: VerificationFilters = {
  assignedTo: "",
  flowType: "",
  status: "",
};

const normalizeSessions = (
  payload?: VerificationReviewQueueResponse,
): VerificationSession[] => {
  const data = payload?.data;
  return Array.isArray(data) ? data : [];
};

const normalizeEvents = (
  payload?: VerificationProviderEventListResponse,
): VerificationProviderEvent[] => {
  const data = payload?.data;
  return Array.isArray(data) ? data : [];
};

const verificationStatusColor = (status: string): string => {
  const normalizedStatus = `${status || ""}`.trim().toLowerCase();
  switch (normalizedStatus) {
    case "approved":
      return "success";
    case "rejected":
    case "failed":
      return "error";
    case "pending_review":
    case "provider_reviewing":
      return "warning";
    case "submitted_to_provider":
    case "questions_presented":
      return "processing";
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

const VerificationReviewPanel = () => {
  const { t } = useTranslation(["page-provider-ops", "common"]);
  const { getTimeWithTimezone } = useTimezone();
  const [filters, setFilters] = useState<VerificationFilters>(DEFAULT_FILTERS);
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSession, setSelectedSession] = useState<VerificationSession | null>(
    null,
  );
  const [events, setEvents] = useState<VerificationProviderEvent[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [note, setNote] = useState("");

  const [triggerQueue, queueLoading, queueResponse] =
    useApi<VerificationReviewQueueResponse>(
      "admin/providers/idcomply/verification-sessions/review-queue",
      Method.GET,
    );
  const [triggerDetail, detailLoading, detailResponse] =
    useApi<VerificationSession>(
      "admin/users/verification-sessions/:sessionID",
      Method.GET,
    );
  const [triggerEvents, eventsLoading, eventsResponse] =
    useApi<VerificationProviderEventListResponse>(
      "admin/users/verification-sessions/:sessionID/events",
      Method.GET,
    );
  const [triggerAssign, assignLoading, assignResponse] =
    useApi<VerificationSession, any, VerificationAssignmentRequest>(
      "admin/users/verification-sessions/:sessionID/assign",
      Method.POST,
    );
  const [triggerAddNote, noteLoading, noteResponse] =
    useApi<VerificationProviderEventListResponse, any, VerificationNoteRequest>(
      "admin/users/verification-sessions/:sessionID/notes",
      Method.POST,
    );
  const [triggerDecision, decisionLoading, decisionResponse] =
    useApi<VerificationSession, any, VerificationDecisionRequest>(
      "admin/users/verification-sessions/:sessionID/decision",
      Method.POST,
    );

  const [decision, setDecision] = useState<VerificationDecisionOption | "">("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionQuestions, setDecisionQuestions] = useState<KBAQuestion[]>([]);

  const refreshQueue = async () => {
    await triggerQueue(undefined, {
      query: {
        provider: "idcomply",
        ...(filters.assignedTo ? { assigned_to: filters.assignedTo } : {}),
        ...(filters.flowType ? { flow_type: filters.flowType } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
    });
  };

  const refreshSelectedSession = async (sessionID: string) => {
    if (!sessionID) {
      return;
    }
    await Promise.all([
      triggerDetail(undefined, { sessionID }),
      triggerEvents(undefined, { sessionID }),
    ]);
  };

  useEffect(() => {
    void refreshQueue();
  }, [filters.assignedTo, filters.flowType, filters.status]);

  useEffect(() => {
    if (!queueResponse.succeeded) {
      return;
    }
    setSessions(normalizeSessions(queueResponse.data));
  }, [queueResponse.succeeded, queueResponse.data]);

  useEffect(() => {
    if (!detailResponse.succeeded || !detailResponse.data) {
      return;
    }
    setSelectedSession(detailResponse.data);
  }, [detailResponse.succeeded, detailResponse.data]);

  useEffect(() => {
    if (!eventsResponse.succeeded) {
      return;
    }
    setEvents(normalizeEvents(eventsResponse.data));
  }, [eventsResponse.succeeded, eventsResponse.data]);

  useEffect(() => {
    if (!assignResponse.succeeded || !assignResponse.data) {
      return;
    }
    setSelectedSession(assignResponse.data);
    setAssignTo("");
    setAssignReason("");
    void refreshQueue();
    void refreshSelectedSession(assignResponse.data.id);
  }, [assignResponse.succeeded, assignResponse.data]);

  useEffect(() => {
    if (!noteResponse.succeeded) {
      return;
    }
    setEvents(normalizeEvents(noteResponse.data));
    setNote("");
    void refreshQueue();
  }, [noteResponse.succeeded, noteResponse.data]);

  useEffect(() => {
    if (!decisionResponse.succeeded || !decisionResponse.data) {
      return;
    }
    setSelectedSession(decisionResponse.data);
    setDecision("");
    setDecisionReason("");
    setDecisionQuestions([]);
    void refreshQueue();
    void refreshSelectedSession(decisionResponse.data.id);
    void message.success(t("VERIFICATION_DECISION_SUCCESS"));
  }, [decisionResponse.succeeded, decisionResponse.data]);

  const submitDecision = async () => {
    if (!selectedSessionId || !decision) {
      return;
    }
    const payload: VerificationDecisionRequest = {
      decision,
      ...(decisionReason.trim() ? { reason: decisionReason.trim() } : {}),
    };
    if (
      decision === "questions" &&
      decisionQuestions.length > 0 &&
      decisionQuestions.some((q) => q.text.trim())
    ) {
      payload.questions = decisionQuestions
        .filter((q) => q.text.trim())
        .map((q, idx) => ({
          questionId: q.questionId || `q-${idx + 1}`,
          text: q.text.trim(),
          choices: q.choices.filter((c) => c.trim()),
        }));
    }
    await triggerDecision(payload, { sessionID: selectedSessionId });
  };

  const addQuestion = () => {
    setDecisionQuestions((prev) => [
      ...prev,
      { questionId: `q-${prev.length + 1}`, text: "", choices: [] },
    ]);
  };

  const updateQuestionText = (index: number, text: string) => {
    setDecisionQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q)),
    );
  };

  const removeQuestion = (index: number) => {
    setDecisionQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const queueCounts = useMemo(() => {
    return sessions.reduce(
      (summary, session) => {
        summary.total += 1;
        if (!`${session.assignedTo || ""}`.trim()) {
          summary.unassigned += 1;
        }
        if (`${session.status || ""}`.trim().toLowerCase() === "pending_review") {
          summary.pendingReview += 1;
        }
        if (
          `${session.status || ""}`.trim().toLowerCase() === "provider_reviewing"
        ) {
          summary.providerReviewing += 1;
        }
        return summary;
      },
      {
        total: 0,
        unassigned: 0,
        pendingReview: 0,
        providerReviewing: 0,
      },
    );
  }, [sessions]);

  const openSession = async (session: VerificationSession) => {
    setDrawerVisible(true);
    setSelectedSessionId(session.id);
    setSelectedSession(session);
    setAssignTo(session.assignedTo || "");
    setAssignReason("");
    setNote("");
    setDecision("");
    setDecisionReason("");
    setDecisionQuestions([]);
    await refreshSelectedSession(session.id);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setSelectedSessionId("");
    setSelectedSession(null);
    setEvents([]);
    setAssignTo("");
    setAssignReason("");
    setNote("");
    setDecision("");
    setDecisionReason("");
    setDecisionQuestions([]);
  };

  const submitAssignment = async () => {
    if (!selectedSessionId || !`${assignTo || ""}`.trim()) {
      return;
    }
    await triggerAssign(
      {
        assignedTo: assignTo.trim(),
        ...(assignReason.trim() ? { reason: assignReason.trim() } : {}),
      },
      { sessionID: selectedSessionId },
    );
  };

  const submitNote = async () => {
    if (!selectedSessionId || !`${note || ""}`.trim()) {
      return;
    }
    await triggerAddNote(
      {
        note: note.trim(),
      },
      { sessionID: selectedSessionId },
    );
  };

  const tableColumns = [
    {
      title: t("VERIFICATION_HEADER_USER"),
      dataIndex: "userId",
      key: "userId",
      ellipsis: true,
    },
    {
      title: t("VERIFICATION_HEADER_FLOW"),
      dataIndex: "flowType",
      key: "flowType",
      render: (value: string) => `${value || "-"}`.toUpperCase(),
    },
    {
      title: t("VERIFICATION_HEADER_STATUS"),
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={verificationStatusColor(value)}>{value || "-"}</Tag>
      ),
    },
    {
      title: t("VERIFICATION_HEADER_ASSIGNED"),
      dataIndex: "assignedTo",
      key: "assignedTo",
      render: (value: string) => value || t("VERIFICATION_UNASSIGNED"),
    },
    {
      title: t("VERIFICATION_HEADER_DECISION"),
      dataIndex: "providerDecision",
      key: "providerDecision",
      render: (value: string) => value || "-",
    },
    {
      title: t("VERIFICATION_HEADER_UPDATED"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: string) =>
        renderTimestamp(value, t("common:DATE_TIME_FORMAT"), getTimeWithTimezone),
    },
    {
      title: t("VERIFICATION_HEADER_ACTIONS"),
      key: "actions",
      render: (_: unknown, record: VerificationSession) => (
        <Button size="small" onClick={() => void openSession(record)}>
          {t("VERIFICATION_ACTION_OPEN")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card title={t("VERIFICATION_QUEUE_TITLE")} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Input
              value={filters.assignedTo}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  assignedTo: event.target.value,
                }))
              }
              placeholder={t("VERIFICATION_FILTER_ASSIGNED")}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              value={filters.flowType || undefined}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  flowType: `${value || ""}`,
                }))
              }
              placeholder={t("VERIFICATION_FILTER_FLOW")}
              style={{ width: "100%" }}
            >
              <Select.Option value="kba">KBA</Select.Option>
              <Select.Option value="idpv">IDPV</Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              value={filters.status || undefined}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  status: `${value || ""}`,
                }))
              }
              placeholder={t("VERIFICATION_FILTER_STATUS")}
              style={{ width: "100%" }}
            >
              <Select.Option value="pending_review">pending_review</Select.Option>
              <Select.Option value="provider_reviewing">
                provider_reviewing
              </Select.Option>
              <Select.Option value="submitted_to_provider">
                submitted_to_provider
              </Select.Option>
              <Select.Option value="questions_presented">
                questions_presented
              </Select.Option>
              <Select.Option value="approved">approved</Select.Option>
              <Select.Option value="rejected">rejected</Select.Option>
              <Select.Option value="failed">failed</Select.Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Button type="primary" onClick={() => void refreshQueue()} loading={queueLoading}>
                {t("VERIFICATION_ACTION_REFRESH")}
              </Button>
              <Button onClick={() => setFilters(DEFAULT_FILTERS)}>
                {t("VERIFICATION_ACTION_RESET")}
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("VERIFICATION_METRIC_TOTAL")}: {queueCounts.total}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("VERIFICATION_METRIC_UNASSIGNED")}: {queueCounts.unassigned}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("VERIFICATION_METRIC_PENDING_REVIEW")}: {queueCounts.pendingReview}
            </Typography.Paragraph>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {t("VERIFICATION_METRIC_PROVIDER_REVIEWING")}:{" "}
              {queueCounts.providerReviewing}
            </Typography.Paragraph>
          </Col>
        </Row>

        <Table
          rowKey={(record: VerificationSession) => record.id}
          columns={tableColumns}
          dataSource={sessions}
          loading={queueLoading}
          pagination={false}
          locale={{ emptyText: t("VERIFICATION_EMPTY") }}
        />
      </Card>

      <Drawer
        title={t("VERIFICATION_DETAIL_TITLE")}
        placement="right"
        width={640}
        onClose={closeDrawer}
        visible={drawerVisible}
      >
        {!selectedSession ? (
          <Empty description={t("VERIFICATION_EMPTY")} />
        ) : (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t("VERIFICATION_HEADER_USER")}>
                {selectedSession.userId}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_FLOW")}>
                {`${selectedSession.flowType || ""}`.toUpperCase() || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_STATUS")}>
                <Tag color={verificationStatusColor(selectedSession.status)}>
                  {selectedSession.status || "-"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_ASSIGNED")}>
                {selectedSession.assignedTo || t("VERIFICATION_UNASSIGNED")}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_PROVIDER_REFERENCE")}>
                {selectedSession.providerReference || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_PROVIDER_CASE")}>
                {selectedSession.providerCaseId || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_DECISION")}>
                {selectedSession.providerDecision || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_LAST_ERROR")}>
                {selectedSession.lastErrorCode || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_CREATED")}>
                {renderTimestamp(
                  selectedSession.createdAt,
                  t("common:DATE_TIME_FORMAT"),
                  getTimeWithTimezone,
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_UPDATED")}>
                {renderTimestamp(
                  selectedSession.updatedAt,
                  t("common:DATE_TIME_FORMAT"),
                  getTimeWithTimezone,
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("VERIFICATION_HEADER_COMPLETED")}>
                {renderTimestamp(
                  selectedSession.completedAt,
                  t("common:DATE_TIME_FORMAT"),
                  getTimeWithTimezone,
                )}
              </Descriptions.Item>
            </Descriptions>

            <Card
              title={t("VERIFICATION_ASSIGN_TITLE")}
              size="small"
              style={{ marginBottom: 16 }}
              loading={detailLoading || assignLoading}
            >
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Input
                    value={assignTo}
                    onChange={(event) => setAssignTo(event.target.value)}
                    placeholder={t("VERIFICATION_FIELD_ASSIGNED_TO")}
                  />
                </Col>
                <Col span={24}>
                  <Input
                    value={assignReason}
                    onChange={(event) => setAssignReason(event.target.value)}
                    placeholder={t("VERIFICATION_FIELD_ASSIGN_REASON")}
                  />
                </Col>
                <Col span={24}>
                  <Button
                    type="primary"
                    onClick={() => void submitAssignment()}
                    loading={assignLoading}
                    disabled={!`${assignTo || ""}`.trim()}
                  >
                    {t("VERIFICATION_ACTION_ASSIGN")}
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card
              title={t("VERIFICATION_NOTE_TITLE")}
              size="small"
              style={{ marginBottom: 16 }}
              loading={noteLoading}
            >
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Input.TextArea
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("VERIFICATION_FIELD_NOTE")}
                  />
                </Col>
                <Col span={24}>
                  <Button
                    type="primary"
                    onClick={() => void submitNote()}
                    loading={noteLoading}
                    disabled={!`${note || ""}`.trim()}
                  >
                    {t("VERIFICATION_ACTION_ADD_NOTE")}
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card
              title={t("VERIFICATION_DECISION_TITLE")}
              size="small"
              style={{ marginBottom: 16 }}
              loading={decisionLoading}
            >
              <Row gutter={[12, 12]}>
                <Col span={24}>
                  <Select
                    value={decision || undefined}
                    onChange={(value) => {
                      setDecision(value as VerificationDecisionOption);
                      if (value !== "questions") {
                        setDecisionQuestions([]);
                      }
                    }}
                    placeholder={t("VERIFICATION_DECISION_PLACEHOLDER")}
                    style={{ width: "100%" }}
                  >
                    {DECISION_OPTIONS.map((opt) => (
                      <Select.Option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={24}>
                  <Input.TextArea
                    rows={2}
                    value={decisionReason}
                    onChange={(event) => setDecisionReason(event.target.value)}
                    placeholder={t("VERIFICATION_DECISION_REASON_PLACEHOLDER")}
                  />
                </Col>
                {decision === "questions" && (
                  <Col span={24}>
                    <Divider style={{ margin: "8px 0" }} />
                    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                      {t("VERIFICATION_DECISION_QUESTIONS_LABEL")}
                    </Typography.Text>
                    {decisionQuestions.map((q, idx) => (
                      <Row key={idx} gutter={[8, 8]} style={{ marginBottom: 8 }}>
                        <Col flex="auto">
                          <Input
                            value={q.text}
                            onChange={(event) =>
                              updateQuestionText(idx, event.target.value)
                            }
                            placeholder={`${t("VERIFICATION_DECISION_QUESTION_TEXT")} ${idx + 1}`}
                          />
                        </Col>
                        <Col>
                          <Button
                            size="small"
                            danger
                            onClick={() => removeQuestion(idx)}
                          >
                            ✕
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <Button size="small" onClick={addQuestion}>
                      {t("VERIFICATION_DECISION_ADD_QUESTION")}
                    </Button>
                  </Col>
                )}
                <Col span={24}>
                  <Button
                    type="primary"
                    onClick={() => void submitDecision()}
                    loading={decisionLoading}
                    disabled={!decision}
                    data-testid="verification-decision-submit"
                  >
                    {t("VERIFICATION_DECISION_SUBMIT")}
                  </Button>
                </Col>
              </Row>
            </Card>

            <Card
              title={t("VERIFICATION_EVENTS_TITLE")}
              size="small"
              loading={eventsLoading}
              extra={
                <Button
                  size="small"
                  onClick={() => void refreshSelectedSession(selectedSessionId)}
                >
                  {t("VERIFICATION_ACTION_REFRESH")}
                </Button>
              }
            >
              {events.length === 0 ? (
                <Empty description={t("VERIFICATION_EVENTS_EMPTY")} />
              ) : (
                <List
                  dataSource={events}
                  renderItem={(event) => (
                    <List.Item key={event.id}>
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Tag color={verificationStatusColor(event.status)}>
                              {event.status || "-"}
                            </Tag>
                            <Typography.Text strong>
                              {event.source || "-"}
                            </Typography.Text>
                          </Space>
                        }
                        description={
                          <>
                            <Typography.Paragraph style={{ marginBottom: 4 }}>
                              {renderTimestamp(
                                event.createdAt,
                                t("common:DATE_TIME_FORMAT"),
                                getTimeWithTimezone,
                              )}
                            </Typography.Paragraph>
                            {event.reason ? (
                              <Typography.Paragraph style={{ marginBottom: 4 }}>
                                {event.reason}
                              </Typography.Paragraph>
                            ) : null}
                            {event.payload ? (
                              <Typography.Paragraph
                                style={{ marginBottom: 0 }}
                                ellipsis={{ rows: 3, expandable: true, symbol: "more" }}
                              >
                                <code>{JSON.stringify(event.payload)}</code>
                              </Typography.Paragraph>
                            ) : null}
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </>
        )}
      </Drawer>
    </>
  );
};

export default VerificationReviewPanel;
