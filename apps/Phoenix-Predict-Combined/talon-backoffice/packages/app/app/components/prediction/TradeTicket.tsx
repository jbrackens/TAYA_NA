"use client";

/**
 * TradeTicket — Yes/No trade form used on the market detail page.
 *
 * Uses the Predict design tokens (--s1/s2, --b1, --yes/--no, --accent,
 * mono font for prices). The side toggle mimics the MarketCard split
 * but at ticket scale; the quantity chips snap to common lot sizes.
 *
 * Lives in the right column of /market/[ticker]. Stays functional at
 * narrow widths (≤360px) so the column can stay compact.
 */

import { useState, useCallback } from "react";
import type {
  PredictionMarket,
  OrderSide,
  OrderPreview,
} from "@phoenix-ui/api-client/src/prediction-types";

interface TradeTicketProps {
  market: PredictionMarket;
  onPreview?: (
    side: OrderSide,
    quantity: number,
  ) => Promise<OrderPreview | null>;
  onSubmit?: (side: OrderSide, quantity: number) => Promise<void>;
}

const QUICK_QTY = [1, 5, 10, 25, 50, 100];

export function TradeTicket({ market, onPreview, onSubmit }: TradeTicketProps) {
  const [side, setSide] = useState<OrderSide>("yes");
  const [quantity, setQuantity] = useState(10);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = market.status === "open";
  const price = side === "yes" ? market.yesPriceCents : market.noPriceCents;
  const estimatedCost = price * quantity;
  const estimatedPayout = 100 * quantity;
  const estimatedProfit = estimatedPayout - estimatedCost;

  const handlePreview = useCallback(async () => {
    if (!onPreview) return;
    setError(null);
    const p = await onPreview(side, quantity);
    if (!p) {
      setError("Could not preview order. Check your balance and try again.");
      return;
    }
    setPreview(p);
  }, [side, quantity, onPreview]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(side, quantity);
      setPreview(null);
      setQuantity(10);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }, [side, quantity, onSubmit]);

  const resetPreview = () => setPreview(null);

  return (
    <div className="tt-wrap">
      <Styles />

      <header className="tt-head">
        <h3 className="tt-title">Trade</h3>
        <span className="tt-sub">Market order</span>
      </header>

      {/* Side toggle */}
      <div className="tt-sides" role="tablist" aria-label="Side">
        <button
          role="tab"
          aria-selected={side === "yes"}
          onClick={() => {
            setSide("yes");
            resetPreview();
          }}
          className={`tt-side yes ${side === "yes" ? "active" : ""}`}
        >
          <span className="tt-side-label">YES</span>
          <span className="tt-side-price mono">{market.yesPriceCents}¢</span>
        </button>
        <button
          role="tab"
          aria-selected={side === "no"}
          onClick={() => {
            setSide("no");
            resetPreview();
          }}
          className={`tt-side no ${side === "no" ? "active" : ""}`}
        >
          <span className="tt-side-label">NO</span>
          <span className="tt-side-price mono">{market.noPriceCents}¢</span>
        </button>
      </div>

      {/* Quantity */}
      <div className="tt-field">
        <label htmlFor="tt-qty" className="tt-field-label">
          Contracts
        </label>
        <div className="tt-qty-row">
          <div className="tt-chips">
            {QUICK_QTY.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuantity(q);
                  resetPreview();
                }}
                className={`tt-chip mono ${quantity === q ? "active" : ""}`}
              >
                {q}
              </button>
            ))}
          </div>
          <input
            id="tt-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => {
              const n = Math.max(1, parseInt(e.target.value, 10) || 1);
              setQuantity(n);
              resetPreview();
            }}
            className="tt-input mono"
            aria-label="Custom contract quantity"
          />
        </div>
      </div>

      {/* Summary */}
      <dl className="tt-summary">
        <div>
          <dt>Avg price</dt>
          <dd className="mono">{preview ? preview.priceCents : price}¢</dd>
        </div>
        <div>
          <dt>Est. cost</dt>
          <dd className="mono">
            ${((preview?.totalCostCents ?? estimatedCost) / 100).toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Max payout</dt>
          <dd className="mono">
            $
            {(
              (preview ? preview.quantity * 100 : estimatedPayout) / 100
            ).toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Max profit</dt>
          <dd className="mono tt-summary-profit">
            +${((preview?.maxProfitCents ?? estimatedProfit) / 100).toFixed(2)}
          </dd>
        </div>
      </dl>

      {error && <div className="tt-error">{error}</div>}

      {/* Actions */}
      <div className="tt-actions">
        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={!isOpen}
            className="tt-btn tt-btn-primary"
          >
            {isOpen ? "Preview order" : "Market closed"}
          </button>
        ) : (
          <>
            <button
              onClick={resetPreview}
              className="tt-btn tt-btn-ghost"
              disabled={submitting}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`tt-btn tt-btn-confirm ${side}`}
            >
              {submitting ? "Placing…" : `Buy ${side.toUpperCase()}`}
            </button>
          </>
        )}
      </div>

      <footer className="tt-foot">
        <span>Market buy · instant fill at AMM price</span>
      </footer>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .tt-wrap {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .tt-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
      }
      .tt-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--t1);
        letter-spacing: -0.01em;
      }
      .tt-sub {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }

      /* Side toggle */
      .tt-sides {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .tt-side {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 12px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s, transform 0.15s;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
      }
      .tt-side:hover { border-color: var(--b2); }
      .tt-side-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--t3);
      }
      .tt-side-price {
        font-size: 18px;
        font-weight: 700;
        color: var(--t1);
      }
      .tt-side.yes.active {
        background: rgba(52,211,153,0.1);
        border-color: var(--yes);
      }
      .tt-side.yes.active .tt-side-label { color: var(--yes); }
      .tt-side.yes.active .tt-side-price { color: var(--yes); }
      .tt-side.no.active {
        background: rgba(248,113,113,0.1);
        border-color: var(--no);
      }
      .tt-side.no.active .tt-side-label { color: var(--no); }
      .tt-side.no.active .tt-side-price { color: var(--no); }

      /* Quantity */
      .tt-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tt-field-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .tt-qty-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tt-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tt-chip {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 600;
        color: var(--t2);
        cursor: pointer;
        transition: all 0.15s;
        min-width: 36px;
      }
      .tt-chip:hover { border-color: var(--b2); color: var(--t1); }
      .tt-chip.active {
        background: var(--accent-soft);
        border-color: var(--accent);
        color: var(--accent);
      }
      .tt-input {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 8px 12px;
        font-size: 14px;
        color: var(--t1);
        width: 100%;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .tt-input:focus {
        border-color: var(--accent);
        box-shadow: var(--accent-glow);
      }

      /* Summary */
      .tt-summary {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 12px 14px;
        margin: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 16px;
      }
      .tt-summary > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .tt-summary dt {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .tt-summary dd {
        font-size: 14px;
        font-weight: 600;
        color: var(--t1);
        margin: 0;
      }
      .tt-summary-profit { color: var(--yes) !important; }

      .tt-error {
        background: rgba(248,113,113,0.1);
        border: 1px solid rgba(248,113,113,0.3);
        color: var(--no);
        border-radius: var(--r-sm);
        padding: 10px 12px;
        font-size: 12px;
      }

      /* Actions */
      .tt-actions {
        display: flex;
        gap: 8px;
      }
      .tt-btn {
        flex: 1;
        padding: 12px 14px;
        border-radius: var(--r-sm);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s;
      }
      .tt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .tt-btn-primary {
        background: var(--accent);
        color: #06222b;
        box-shadow: var(--accent-glow);
      }
      .tt-btn-primary:hover:not(:disabled) { background: var(--accent-hi); }

      .tt-btn-ghost {
        background: transparent;
        color: var(--t2);
        border-color: var(--b2);
        flex: 0 0 auto;
        padding: 12px 18px;
      }
      .tt-btn-ghost:hover:not(:disabled) { background: var(--s2); color: var(--t1); }

      .tt-btn-confirm.yes {
        background: var(--yes);
        color: #052e21;
        box-shadow: 0 0 24px rgba(52,211,153,0.35);
      }
      .tt-btn-confirm.yes:hover:not(:disabled) { background: #4ade80; }
      .tt-btn-confirm.no {
        background: var(--no);
        color: #3a0c0c;
        box-shadow: 0 0 24px rgba(248,113,113,0.35);
      }
      .tt-btn-confirm.no:hover:not(:disabled) { background: #fb8484; }

      .tt-foot {
        padding-top: 4px;
        border-top: 1px solid var(--b1);
        font-size: 11px;
        color: var(--t3);
        text-align: center;
      }
    `}</style>
  );
}
