import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";
import type { MarketCandidate } from "../../lib/ai/types";
import type { ValidationResult } from "../../lib/ai/marketQualityValidator";

const { TextArea } = Input;
const { Text } = Typography;

interface CandidateView {
  candidate: MarketCandidate;
  validation: ValidationResult;
}

interface DraftResponse {
  articleSourceId?: string;
  aiGenerationLogIds?: string[];
  analysis?: { articleSummary?: string };
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

export interface DraftFromArticleModalProps {
  open: boolean;
  onClose: () => void;
  onUse: (
    candidate: MarketCandidate,
    articleSourceId?: string,
    aiGenerationLogIds?: string[],
  ) => void;
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
      width={760}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
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

        {result?.analysis?.articleSummary && (
          <Alert
            type="info"
            message="AI summary"
            description={result.analysis.articleSummary}
          />
        )}

        {(result?.candidates ?? []).map((cv, i) => {
          const c = cv.candidate;
          const v = cv.validation;
          const usable = v.ok && !v.blocked;
          return (
            <Card key={i} size="small" title={c.marketQuestion}>
              <Space wrap size="small">
                <Tag>{c.marketType}</Tag>
                <Tag color={riskColor[c.riskLevel] ?? "default"}>
                  {c.riskLevel} risk
                </Tag>
                {c.qualityScores && (
                  <Tag>
                    quality {c.qualityScores.overallQualityScore.toFixed(2)}
                  </Tag>
                )}
                <Text type="secondary">
                  closes {new Date(c.proposedCloseTime).toLocaleString()}
                </Text>
              </Space>
              {v.warnings.length > 0 && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="warning"
                  message={v.warnings.join("; ")}
                />
              )}
              {!usable && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="error"
                  message={
                    v.blocked
                      ? "Blocked — not eligible for publication."
                      : v.errors.join("; ")
                  }
                />
              )}
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  disabled={!usable}
                  onClick={() =>
                    onUse(c, result?.articleSourceId, result?.aiGenerationLogIds)
                  }
                >
                  Use this
                </Button>
              </div>
            </Card>
          );
        })}
      </Space>
    </Modal>
  );
}
