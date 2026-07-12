"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

// Point-pack catalogue administration (owner decision 2026-07-12, item 3).
// Reads/writes the gateway catalogue at /api/v1/admin/store/packs — RBAC:
// finances:view to read, finances:write to mutate. Purchases are unaffected
// by edits (they carry immutable snapshots); changes apply to future
// checkouts only. The gateway registers this API only when STORE_ENABLED.

interface AdminPack {
  id: string;
  name: string;
  priceUsdCents: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  displayOrder: number;
  active: boolean;
  badge: string;
  introOnly: boolean;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  stripePriceId: string;
}

interface PackFormState {
  id: string;
  name: string;
  priceUsdCents: string;
  basePoints: string;
  bonusPoints: string;
  displayOrder: string;
  active: boolean;
  badge: string;
  introOnly: boolean;
  promoStartsAt: string;
  promoEndsAt: string;
  stripePriceId: string;
}

const EMPTY_FORM: PackFormState = {
  id: "",
  name: "",
  priceUsdCents: "",
  basePoints: "",
  bonusPoints: "0",
  displayOrder: "0",
  active: true,
  badge: "",
  introOnly: false,
  promoStartsAt: "",
  promoEndsAt: "",
  stripePriceId: "",
};

const pageTitleClassName =
  "mb-1 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const tableHeaderClassName =
  "border-b border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const tableCellClassName =
  "border-b border-[var(--border-1,#e5dfd2)] p-3 align-top text-sm text-[var(--t1,#1a1a1a)]";
const monoClassName =
  "font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] text-[var(--t1,#1a1a1a)]";
const labelClassName =
  "flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const inputClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--t1,#1a1a1a)]";
const checkboxLabelClassName =
  "flex items-center gap-2 text-sm font-medium text-[var(--t1,#1a1a1a)]";

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function pts(points: number): string {
  return `${points.toLocaleString("en-US")} pts`;
}

function formFromPack(pack: AdminPack): PackFormState {
  return {
    id: pack.id,
    name: pack.name,
    priceUsdCents: String(pack.priceUsdCents),
    basePoints: String(pack.basePoints),
    bonusPoints: String(pack.bonusPoints),
    displayOrder: String(pack.displayOrder),
    active: pack.active,
    badge: pack.badge ?? "",
    introOnly: pack.introOnly,
    promoStartsAt: pack.promoStartsAt ?? "",
    promoEndsAt: pack.promoEndsAt ?? "",
    stripePriceId: pack.stripePriceId ?? "",
  };
}

function payloadFromForm(form: PackFormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    priceUsdCents: Number(form.priceUsdCents),
    basePoints: Number(form.basePoints),
    bonusPoints: Number(form.bonusPoints || "0"),
    displayOrder: Number(form.displayOrder || "0"),
    active: form.active,
    badge: form.badge.trim(),
    introOnly: form.introOnly,
    promoStartsAt: form.promoStartsAt.trim() || null,
    promoEndsAt: form.promoEndsAt.trim() || null,
    stripePriceId: form.stripePriceId.trim(),
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string };
    };
    return body.error?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default function StorePacksPage() {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<PackFormState | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch("/api/v1/admin/store/packs");
        if (!res.ok) throw new Error(await readError(res));
        const body = (await res.json()) as { items: AdminPack[] };
        if (!cancelled) setPacks(body.items ?? []);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Catalogue could not load.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const totalPreview = useMemo(() => {
    if (!editing) return 0;
    return Number(editing.basePoints || 0) + Number(editing.bonusPoints || 0);
  }, [editing]);

  const save = useCallback(async () => {
    if (!editing || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = payloadFromForm(editing);
      const res = isCreate
        ? await adminFetch("/api/v1/admin/store/packs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id.trim(), ...payload }),
          })
        : await adminFetch(
            `/api/v1/admin/store/packs/${encodeURIComponent(editing.id)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
      if (!res.ok) throw new Error(await readError(res));
      setNotice(
        isCreate
          ? `Pack "${editing.id}" created.`
          : `Pack "${editing.id}" saved.`,
      );
      setEditing(null);
      setIsCreate(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [editing, isCreate, saving]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClassName}>Point Packs</h1>
          <p className="text-sm text-[var(--t2,#4a4a4a)]">
            Catalogue for the player Point Store. Edits apply to future
            checkouts only — completed purchases keep their snapshots. Prices
            are real-money integer cents; points are whole gameplay points.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreate(true);
            setEditing({ ...EMPTY_FORM });
            setNotice(null);
          }}
        >
          New pack
        </Button>
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-4 py-3 text-sm text-[var(--t1,#1a1a1a)]">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-4 py-3 text-sm text-[var(--no-text,#b4321f)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <p className="p-6 text-sm text-[var(--t2,#4a4a4a)]">
            Loading catalogue…
          </p>
        </Card>
      ) : (
        <Card>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={tableHeaderClassName}>Pack</th>
                <th className={tableHeaderClassName}>Price</th>
                <th className={tableHeaderClassName}>Base</th>
                <th className={tableHeaderClassName}>Bonus</th>
                <th className={tableHeaderClassName}>Total</th>
                <th className={tableHeaderClassName}>Badge</th>
                <th className={tableHeaderClassName}>Order</th>
                <th className={tableHeaderClassName}>Status</th>
                <th className={tableHeaderClassName} />
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr key={pack.id}>
                  <td className={tableCellClassName}>
                    <div className="font-semibold">{pack.name}</div>
                    <div className={monoClassName}>{pack.id}</div>
                  </td>
                  <td className={`${tableCellClassName} ${monoClassName}`}>
                    {usd(pack.priceUsdCents)}
                  </td>
                  <td className={`${tableCellClassName} ${monoClassName}`}>
                    {pts(pack.basePoints)}
                  </td>
                  <td className={`${tableCellClassName} ${monoClassName}`}>
                    {pack.bonusPoints > 0 ? `+${pts(pack.bonusPoints)}` : "—"}
                  </td>
                  <td className={`${tableCellClassName} ${monoClassName}`}>
                    {pts(pack.totalPoints)}
                  </td>
                  <td className={tableCellClassName}>{pack.badge || "—"}</td>
                  <td className={`${tableCellClassName} ${monoClassName}`}>
                    {pack.displayOrder}
                  </td>
                  <td className={tableCellClassName}>
                    {pack.active ? "Active" : "Inactive"}
                    {pack.introOnly ? " · first-checkout only" : ""}
                  </td>
                  <td className={tableCellClassName}>
                    <Button
                      onClick={() => {
                        setIsCreate(false);
                        setEditing(formFromPack(pack));
                        setNotice(null);
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {packs.length === 0 ? (
                <tr>
                  <td className={tableCellClassName} colSpan={9}>
                    No packs configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      )}

      {editing ? (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-bold text-[var(--t1,#1a1a1a)]">
              {isCreate ? "Create pack" : `Edit pack: ${editing.id}`}
            </h2>
            <div className="grid grid-cols-2 gap-4 max-w-3xl">
              {isCreate ? (
                <label className={labelClassName}>
                  Id (slug)
                  <input
                    className={inputClassName}
                    value={editing.id}
                    onChange={(e) =>
                      setEditing({ ...editing, id: e.target.value })
                    }
                    placeholder="e.g. mega"
                  />
                </label>
              ) : null}
              <label className={labelClassName}>
                Name
                <input
                  className={inputClassName}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Price (integer US cents —{" "}
                {usd(Number(editing.priceUsdCents) || 0)})
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  value={editing.priceUsdCents}
                  onChange={(e) =>
                    setEditing({ ...editing, priceUsdCents: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Base points
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  value={editing.basePoints}
                  onChange={(e) =>
                    setEditing({ ...editing, basePoints: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Bonus points (promotional, shown separately)
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  value={editing.bonusPoints}
                  onChange={(e) =>
                    setEditing({ ...editing, bonusPoints: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Total (computed)
                <input
                  className={inputClassName}
                  value={pts(totalPreview)}
                  disabled
                />
              </label>
              <label className={labelClassName}>
                Badge (optional; renders only when set)
                <input
                  className={inputClassName}
                  value={editing.badge}
                  onChange={(e) =>
                    setEditing({ ...editing, badge: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Display order
                <input
                  className={inputClassName}
                  inputMode="numeric"
                  value={editing.displayOrder}
                  onChange={(e) =>
                    setEditing({ ...editing, displayOrder: e.target.value })
                  }
                />
              </label>
              <label className={labelClassName}>
                Promo starts (ISO 8601, optional)
                <input
                  className={inputClassName}
                  value={editing.promoStartsAt}
                  onChange={(e) =>
                    setEditing({ ...editing, promoStartsAt: e.target.value })
                  }
                  placeholder="2026-08-01T00:00:00Z"
                />
              </label>
              <label className={labelClassName}>
                Promo ends (ISO 8601, optional)
                <input
                  className={inputClassName}
                  value={editing.promoEndsAt}
                  onChange={(e) =>
                    setEditing({ ...editing, promoEndsAt: e.target.value })
                  }
                  placeholder="2026-08-15T00:00:00Z"
                />
              </label>
              <label className={labelClassName}>
                Stripe price id (future mapping, optional)
                <input
                  className={inputClassName}
                  value={editing.stripePriceId}
                  onChange={(e) =>
                    setEditing({ ...editing, stripePriceId: e.target.value })
                  }
                  placeholder="price_…"
                />
              </label>
              <div className="flex flex-col justify-end gap-2">
                <label className={checkboxLabelClassName}>
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing({ ...editing, active: e.target.checked })
                    }
                  />
                  Active (visible in the player store)
                </label>
                <label className={checkboxLabelClassName}>
                  <input
                    type="checkbox"
                    checked={editing.introOnly}
                    onChange={(e) =>
                      setEditing({ ...editing, introOnly: e.target.checked })
                    }
                  />
                  First-checkout only
                </label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : isCreate ? "Create pack" : "Save pack"}
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setIsCreate(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
