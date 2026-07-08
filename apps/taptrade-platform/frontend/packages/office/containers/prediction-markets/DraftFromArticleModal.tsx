import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { EditSuggestion, MarketCandidate } from "../../lib/ai/types";
import type { ValidationResultV2 } from "../../lib/ai/marketQualityValidator";
import type { ExtractionMeta } from "../../lib/ingest/urlFetch";

const { TextArea } = Input;
const { Text } = Typography;

interface CandidateView {
  candidate: MarketCandidate;
  validation: ValidationResultV2;
}

interface DraftResponse {
  articleSourceId?: string;
  aiGenerationLogIds?: string[];
  analysis?: { articleSummary?: string };
  extraction?: ExtractionMeta;
  injectionSignals?: string[];
  eventGroups?: Array<{
    title: string;
    description?: string;
    candidateTitles: string[];
  }>;
  candidates?: CandidateView[];
  injectionDetected?: boolean;
  error?: string;
}

// AntD Tag colors keyed to risk level; falls back to neutral for unknowns.
const riskColor: Record<string, string> = {
  low: "green",
  medium: "gold",
  high: "orange",
  blocked: "red",
};

const readinessColor: Record<string, string> = {
  ready: "green",
  needs_edits: "gold",
  needs_review: "orange",
  reject: "red",
};

const commercialColor: Record<string, string> = {
  high: "green",
  medium: "gold",
  low: "default",
};

const severityColor: Record<string, string> = {
  info: "blue",
  warning: "gold",
  critical: "red",
};

export interface DraftFromArticleModalProps {
  open: boolean;
  onClose: () => void;
  onUse: (
    candidate: MarketCandidate,
    articleSourceId?: string,
    aiGenerationLogIds?: string[],
  ) => void;
}

function ExtractionPreview({ meta }: { meta: ExtractionMeta }) {
  const confidencePct = Math.round(meta.extractionConfidence * 100);
  const tone =
    meta.extractionConfidence >= 0.7
      ? "success"
      : meta.extractionConfidence >= 0.4
        ? "warning"
        : "error";
  return (
    <Alert
      type={tone === "success" ? "info" : tone}
      message={
        <Space wrap size="small">
          <Text strong>Extraction</Text>
          <Tag color={tone === "success" ? "green" : tone === "warning" ? "gold" : "red"}>
            {confidencePct}% confidence
          </Tag>
          {meta.domain && <Tag>{meta.publisher ?? meta.domain}</Tag>}
          {meta.publishedAt && (
            <Text type="secondary">
              published {new Date(meta.publishedAt).toLocaleDateString()}
            </Text>
          )}
          {meta.updatedAt && (
            <Text type="secondary">
              updated {new Date(meta.updatedAt).toLocaleDateString()}
            </Text>
          )}
          <Text type="secondary">{meta.charCount.toLocaleString()} chars</Text>
        </Space>
      }
      description={
        <>
          {meta.title && <div>“{meta.title}”{meta.author ? ` — ${meta.author}` : ""}</div>}
          {meta.warnings.length > 0 && (
            <ul style={{ margin: "4px 0 0 16px" }}>
              {meta.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </>
      }
    />
  );
}

function SuggestionsTable({ suggestions }: { suggestions: EditSuggestion[] }) {
  return (
    <Table
      size="small"
      pagination={false}
      rowKey={(r) => `${r.field}:${r.suggestedValue}`}
      dataSource={suggestions}
      columns={[
        {
          title: "",
          dataIndex: "severity",
          width: 80,
          render: (s: string) => <Tag color={severityColor[s]}>{s}</Tag>,
        },
        { title: "Field", dataIndex: "field", width: 220 },
        {
          title: "Suggestion",
          dataIndex: "suggestedValue",
          render: (v: string, r) => (
            <>
              <div>{v}</div>
              <Text type="secondary">{r.reason}</Text>
            </>
          ),
        },
      ]}
    />
  );
}

function CandidateCard({
  view,
  onUse,
}: {
  view: CandidateView;
  onUse: () => void;
}) {
  const c = view.candidate;
  const v = view.validation;
  const blocked = v.blocked || v.readiness === "reject";
  const needsConfirm = !blocked && v.readiness !== "ready";
  const plan = c.resolutionPlan;
  const dup = c.duplicateRisk;
  const evt = c.eventRecommendation;

  const useButton = (
    <Button type="primary" disabled={blocked} onClick={needsConfirm ? undefined : onUse}>
      Prefill create form
    </Button>
  );

  return (
    <Card
      size="small"
      title={
        <Space wrap size="small">
          <span>{c.marketQuestion}</span>
        </Space>
      }
    >
      <Space wrap size="small">
        <Tag color={readinessColor[v.readiness]}>{v.readiness.replace("_", " ")}</Tag>
        <Tag color={riskColor[c.riskLevel] ?? "default"}>{c.riskLevel} risk</Tag>
        <Tag color={commercialColor[v.commercialScore.label]}>
          commercial {v.commercialScore.score}
        </Tag>
        {c.templateId && <Tag>{c.templateId}</Tag>}
        {c.category && <Tag>{c.category}</Tag>}
        <Text type="secondary">
          closes {new Date(c.proposedCloseTime).toLocaleString()}
        </Text>
      </Space>

      <Descriptions size="small" column={1} className="mt-2">
        <Descriptions.Item label="Resolves via">
          {plan?.primaryResolutionSource ?? (
            <Text type="danger">no named source</Text>
          )}
          {plan?.resolutionSourceUrl ? ` (${plan.resolutionSourceUrl})` : ""}
          {plan?.resolverType ? ` · ${plan.resolverType}` : ""}
        </Descriptions.Item>
        {v.knownOutcomeRisk.risk !== "low" && (
          <Descriptions.Item label="Known-outcome">
            <Text type={v.knownOutcomeRisk.risk === "blocked" ? "danger" : "warning"}>
              [{v.knownOutcomeRisk.risk}] {v.knownOutcomeRisk.explanation}
            </Text>
          </Descriptions.Item>
        )}
        {dup && dup.risk !== "low" && (
          <Descriptions.Item label="Duplicates">
            <Text type={dup.risk === "high" ? "danger" : "warning"}>
              {dup.recommendedAction.replace(/_/g, " ")} —{" "}
              {dup.similarMarkets
                .slice(0, 2)
                .map((m) => `“${m.title}” (${Math.round(m.similarity * 100)}%)`)
                .join(", ")}
            </Text>
          </Descriptions.Item>
        )}
        {evt && evt.action !== "none" && (
          <Descriptions.Item label="Event">
            {evt.action === "attach_existing"
              ? `attach to existing event ${evt.existingEventTitle ?? evt.existingEventId}`
              : `group as “${evt.proposedEventTitle}”`}
            {evt.reason ? ` — ${evt.reason}` : ""}
          </Descriptions.Item>
        )}
      </Descriptions>

      {(c.warnings?.length ?? 0) > 0 && (
        <Alert className="mt-2" type="warning" message={c.warnings!.join("; ")} />
      )}
      {blocked && (
        <Alert
          className="mt-2"
          type="error"
          message={
            v.blocked
              ? `Blocked — ${v.errors.join("; ") || v.knownOutcomeRisk.explanation}`
              : "Rejected — near-duplicate or unresolvable as drafted."
          }
        />
      )}

      {(v.editSuggestions.length > 0 || v.warnings.length > 0) && (
        <Collapse
          size="small"
          className="mt-2"
          items={[
            {
              key: "edits",
              label: `Fix before launch (${v.editSuggestions.length} suggestions)`,
              children: (
                <>
                  {v.warnings.length > 0 && (
                    <ul style={{ margin: "0 0 8px 16px" }}>
                      {v.warnings.map((w) => (
                        <li key={w}>
                          <Text type="secondary">{w}</Text>
                        </li>
                      ))}
                    </ul>
                  )}
                  <SuggestionsTable suggestions={v.editSuggestions} />
                </>
              ),
            },
          ]}
        />
      )}

      <div className="mt-2">
        {needsConfirm ? (
          <Popconfirm
            title={`This candidate is marked "${v.readiness.replace("_", " ")}"`}
            description="Prefill anyway? Review the suggestions before creating."
            okText="Prefill anyway"
            onConfirm={onUse}
          >
            {useButton}
          </Popconfirm>
        ) : (
          useButton
        )}
      </div>
    </Card>
  );
}

export default function DraftFromArticleModal({
  open,
  onClose,
  onUse,
}: DraftFromArticleModalProps) {
  const { message } = App.useApp();
  const [articleText, setArticleText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftResponse | null>(null);

  async function generate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/market-bot/draft", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleText: articleText.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          userNotes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as DraftResponse;
      if (!res.ok) {
        message.error(data.error || `Draft failed (${res.status})`);
        return;
      }
      setResult(data);
      if (!data.candidates || data.candidates.length === 0) {
        message.info("No candidate markets were generated for this article.");
      }
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Draft request failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Draft markets from an article"
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
    >
      <Space direction="vertical" className="w-full" size="middle">
        <TextArea
          rows={6}
          placeholder="Paste the article text…"
          value={articleText}
          onChange={(e) => setArticleText(e.target.value)}
        />
        <Input
          placeholder="Article URL (optional — fetched server-side)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        <Input
          placeholder="Notes for the AI (optional, e.g. focus on legal outcomes)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          type="primary"
          loading={loading}
          disabled={!articleText.trim() && !sourceUrl.trim()}
          onClick={generate}
        >
          Generate candidates
        </Button>

        {result?.extraction && <ExtractionPreview meta={result.extraction} />}

        {(result?.injectionSignals?.length ?? 0) > 0 && (
          <Alert
            type="warning"
            message="Hostile-content signals in the article"
            description={`Patterns detected: ${result!.injectionSignals!.join(", ")}. Candidates were generated with the article treated strictly as data — review with extra care.`}
          />
        )}

        {result?.analysis?.articleSummary && (
          <Alert
            type="info"
            message="AI summary"
            description={result.analysis.articleSummary}
          />
        )}

        {(result?.eventGroups?.length ?? 0) > 0 && (
          <Alert
            type="info"
            message="Suggested event grouping"
            description={
              <ul style={{ margin: "0 0 0 16px" }}>
                {result!.eventGroups!.map((g) => (
                  <li key={g.title}>
                    <Text strong>{g.title}</Text>
                    {g.description ? ` — ${g.description}` : ""} (
                    {g.candidateTitles.length} markets)
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {(result?.candidates ?? []).map((cv, i) => (
          <CandidateCard
            key={i}
            view={cv}
            onUse={() =>
              onUse(
                cv.candidate,
                result?.articleSourceId,
                result?.aiGenerationLogIds,
              )
            }
          />
        ))}
      </Space>
    </Modal>
  );
}
