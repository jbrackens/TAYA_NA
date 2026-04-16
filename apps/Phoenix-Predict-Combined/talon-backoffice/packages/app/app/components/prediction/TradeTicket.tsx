'use client';

import React, { useState, useCallback } from 'react';
import type { PredictionMarket, OrderSide, OrderPreview } from '@phoenix-ui/api-client/src/prediction-types';

interface TradeTicketProps {
  market: PredictionMarket;
  onPreview?: (side: OrderSide, quantity: number) => Promise<OrderPreview | null>;
  onSubmit?: (side: OrderSide, quantity: number) => Promise<void>;
}

export function TradeTicket({ market, onPreview, onSubmit }: TradeTicketProps) {
  const [side, setSide] = useState<OrderSide>('yes');
  const [quantity, setQuantity] = useState(10);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(async () => {
    if (!onPreview) return;
    setError(null);
    const p = await onPreview(side, quantity);
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
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }, [side, quantity, onSubmit]);

  const isOpen = market.status === 'open';
  const price = side === 'yes' ? market.yesPriceCents : market.noPriceCents;
  const estimatedCost = (price * quantity);

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/80">
      <h3 className="text-sm font-semibold text-white mb-3">Trade</h3>

      {/* Side selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setSide('yes'); setPreview(null); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'yes'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Yes {market.yesPriceCents}%
        </button>
        <button
          onClick={() => { setSide('no'); setPreview(null); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            side === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          No {market.noPriceCents}%
        </button>
      </div>

      {/* Quantity input */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">Contracts</label>
        <div className="flex items-center gap-2">
          {[1, 5, 10, 25, 50].map(q => (
            <button
              key={q}
              onClick={() => { setQuantity(q); setPreview(null); }}
              className={`px-2 py-1 rounded text-xs ${
                quantity === q ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {q}
            </button>
          ))}
          <input
            type="number"
            value={quantity}
            onChange={e => { setQuantity(Math.max(1, parseInt(e.target.value) || 1)); setPreview(null); }}
            className="w-16 bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-700 text-center"
            min={1}
          />
        </div>
      </div>

      {/* Cost estimate */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4 text-xs space-y-1">
        <div className="flex justify-between text-gray-400">
          <span>Avg price</span>
          <span>{preview ? preview.priceCents : price}%</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Est. cost</span>
          <span>${((preview?.totalCostCents ?? estimatedCost) / 100).toFixed(2)}</span>
        </div>
        {preview && (
          <>
            <div className="flex justify-between text-green-400">
              <span>Max profit</span>
              <span>${(preview.maxProfitCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Max loss</span>
              <span>${(preview.maxLossCents / 100).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 mb-3 px-1">{error}</div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={!isOpen}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isOpen ? 'Preview Order' : 'Market Closed'}
          </button>
        ) : (
          <>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:bg-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                side === 'yes' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              } disabled:opacity-50`}
            >
              {submitting ? 'Placing...' : `Buy ${side.toUpperCase()}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
