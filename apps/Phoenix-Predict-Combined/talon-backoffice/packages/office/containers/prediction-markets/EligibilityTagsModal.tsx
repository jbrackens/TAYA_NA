"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Tag } from "antd";
import { adminFetch } from "../../app/lib/admin-fetch";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

// GAP-98 (PAM §15 Prediction Market Account Functions / §25 Admin Operations):
// per-market eligibility-tag CONFIG. GAP-20 slice 2 built the write route
// (GET/POST /api/v1/admin/markets/{id}/eligibility-tags, markets:edit, audited
// market.eligibility_tags_changed) — the sole prod writer to market_eligibility
// _tags — but no office page consumed it, so an operator could not DECLARE which
// tags a restricted market requires (GAP-93 shipped only the per-PLAYER read).
// This is that operator surface. The whole route gates on markets:edit (the
// markets handler's top-level gate), so the opening control + every mutation here
// are markets:edit-gated fail-closed; the gateway re-checks + audits.

interface CatalogTag {
  id: number;
  name: string;
}

export default function EligibilityTagsModal({
  market,
  canEdit,
  onClose,
}: {
  market: PredictionMarket | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [catalog, setCatalog] = useState<CatalogTag[]>([]);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [rawId, setRawId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (marketId: string) => {
      setLoading(true);
      try {
        const res = await adminFetch(
          `/api/v1/admin/markets/${encodeURIComponent(marketId)}/eligibility-tags`,
        );
        if (res.ok) {
          const d = await res.json();
          setTagIds(Array.isArray(d?.tagIds) ? d.tagIds : []);
        }
        // Degrade-safe: the tag catalog (names + the add dropdown) needs a
        // SEPARATE segments:read grant, which a markets:edit-only operator (the
        // GAP-92 market-operations role) may not hold. If it fails, fall back to
        // adding by raw tag id.
        try {
          const c = await adminFetch("/api/v1/admin/segments/tags");
          if (c.ok) {
            const cd = await c.json();
            setCatalog(Array.isArray(cd?.tags) ? cd.tags : []);
          }
        } catch {
          /* no catalog -> ids only */
        }
      } catch {
        message.error("Failed to load eligibility tags");
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    if (market) {
      setSelected(undefined);
      setRawId("");
      void load(market.id);
    }
  }, [market, load]);

  const nameFor = (id: number) =>
    catalog.find((t) => t.id === id)?.name ?? `#${id}`;

  const mutate = async (tagId: number, op: "add" | "remove") => {
    if (!market || !canEdit) return;
    setBusy(true);
    try {
      const res = await adminFetch(
        `/api/v1/admin/markets/${encodeURIComponent(market.id)}/eligibility-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagId, op }),
        },
      );
      if (!res.ok) throw new Error(`${op} failed (${res.status})`);
      message.success(op === "add" ? "Tag added" : "Tag removed");
      setSelected(undefined);
      setRawId("");
      await load(market.id);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const addable = catalog.filter((t) => !tagIds.includes(t.id));

  return (
    <Modal
      title={
        market ? `Eligibility tags — ${market.ticker}` : "Eligibility tags"
      }
      open={market !== null}
      onCancel={onClose}
      footer={null}
    >
      <p className="mb-2 text-xs text-[var(--t3,#8b8378)]">
        A player must hold ALL required tags to trade this restricted market. No
        required tags means the market is open to every eligible player.
      </p>
      <div className="mb-3" data-testid="eligibility-current">
        {loading ? (
          "Loading…"
        ) : tagIds.length === 0 ? (
          <span>No required tags — open to all eligible players.</span>
        ) : (
          <Space size={[6, 6]} wrap>
            {tagIds.map((id) => (
              <Tag
                key={id}
                closable={canEdit && !busy}
                onClose={(e) => {
                  e.preventDefault();
                  void mutate(id, "remove");
                }}
                data-testid={`elig-tag-${id}`}
              >
                {nameFor(id)}
              </Tag>
            ))}
          </Space>
        )}
      </div>
      {catalog.length > 0 ? (
        <Space.Compact style={{ width: "100%" }}>
          <Select
            style={{ flex: 1 }}
            placeholder="Add a required tag"
            value={selected}
            onChange={setSelected}
            disabled={!canEdit || busy}
            options={addable.map((t) => ({ value: t.id, label: t.name }))}
            data-testid="eligibility-add-select"
          />
          <Button
            type="primary"
            disabled={!canEdit || busy || selected === undefined}
            onClick={() =>
              selected !== undefined && void mutate(selected, "add")
            }
            data-testid="eligibility-add-submit"
          >
            Add
          </Button>
        </Space.Compact>
      ) : (
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Tag id"
            value={rawId}
            onChange={(e) => setRawId(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={!canEdit || busy}
            data-testid="eligibility-add-raw"
          />
          <Button
            type="primary"
            disabled={!canEdit || busy || rawId.trim() === ""}
            onClick={() => {
              const id = Number(rawId);
              if (Number.isInteger(id) && id > 0) void mutate(id, "add");
            }}
            data-testid="eligibility-add-submit"
          >
            Add
          </Button>
        </Space.Compact>
      )}
    </Modal>
  );
}
