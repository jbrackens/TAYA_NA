"use client";

import { logger } from "../lib/logger";

interface BetCardData {
  selectionName: string;
  odds: number;
  stakeCents: number;
  payoutCents: number;
  betId: string;
}

export async function generateBetCardImage(data: BetCardData): Promise<Blob> {
  const W = 800;
  const H = 500;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0d18");
  bg.addColorStop(1, "#0d1120");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = "rgba(43, 228, 128,0.3)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Branding top-left
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.fillText("TAYA NA!", 40, 32);

  // Selection name — center
  ctx.font = "bold 64px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Truncate long selection names
  let displayName = data.selectionName;
  const maxWidth = W - 100;
  while (
    ctx.measureText(displayName).width > maxWidth &&
    displayName.length > 3
  ) {
    displayName = displayName.slice(0, -4) + "...";
  }
  ctx.fillText(displayName, W / 2, H * 0.4);

  // Odds in green
  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = "var(--accent)";
  ctx.fillText(`@${data.odds.toFixed(2)}`, W / 2, H * 0.56);

  // Bottom row — stake left, payout right
  const stakeStr = `Staked $${(data.stakeCents / 100).toFixed(2)}`;
  const payoutStr = `Won $${(data.payoutCents / 100).toFixed(2)}`;

  ctx.font = "36px sans-serif";
  ctx.fillStyle = "#D3D3D3";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(stakeStr, 40, H - 36);

  ctx.textAlign = "right";
  ctx.fillText(payoutStr, W - 40, H - 36);

  // "WINNER" stamp — rotated, semitransparent
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate((-15 * Math.PI) / 180);
  ctx.font = "bold 120px sans-serif";
  ctx.fillStyle = "rgba(43, 228, 128,0.14)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WINNER", 0, 0);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas toBlob returned null"));
      }
    }, "image/png");
  });
}

export async function copyBetCardToClipboard(
  data: BetCardData,
): Promise<boolean> {
  try {
    const blob = await generateBetCardImage(data);
    if (typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    }
    return false;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      "ShareableBetCard",
      "Failed to copy bet card to clipboard",
      message,
    );
    return false;
  }
}

export function downloadBetCard(data: BetCardData): void {
  generateBetCardImage(data)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taya-na-win-${data.betId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("ShareableBetCard", "Failed to download bet card", message);
    });
}
