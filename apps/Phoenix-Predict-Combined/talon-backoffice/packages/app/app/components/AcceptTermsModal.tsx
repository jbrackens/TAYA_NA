"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { acceptTerms } from "../lib/api/auth-client";
import { apiClient } from "../lib/api/client";

interface AcceptTermsModalProps {
  open: boolean;
  onAccepted: () => void;
  onLogout: () => void;
  userId: string;
}

export default function AcceptTermsModal({
  open,
  onAccepted,
  onLogout,
  userId,
}: AcceptTermsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsContent, setTermsContent] = useState<string>("");
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchTermsContent();
    }
  }, [open]);

  const fetchTermsContent = async () => {
    setContentLoading(true);
    try {
      const response = await apiClient.get("/api/v1/content/terms");
      if (typeof response === "object" && response !== null) {
        const rawContent = (response as Record<string, unknown>).content;
        const content =
          typeof rawContent === "string" ? rawContent : String(response);
        setTermsContent(content);
      } else {
        setTermsContent(String(response));
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load terms";
      setError(errorMessage);
      setTermsContent("Terms and conditions unavailable");
    } finally {
      setContentLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom =
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 10;
    setIsScrolledToBottom(isAtBottom);
  };

  const handleAccept = async () => {
    if (!isScrolledToBottom) {
      setError("Please read and scroll to the end of the terms");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await acceptTerms({
        user_id: userId,
        terms_version: "1.0",
      });
      onAccepted();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to accept terms";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const scrollContainerClass =
    "h-[300px] overflow-y-auto rounded border border-[#1a1f3a] bg-[#0a0e18] p-3 text-[13px] leading-[1.6] text-slate-300";
  const acceptButtonClass = [
    "flex-1 rounded border-0 px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
    isScrolledToBottom
      ? "cursor-pointer bg-[var(--accent)] text-[#0f1225] enabled:hover:bg-[#ea580c]"
      : "cursor-not-allowed bg-gray-600 text-slate-300",
    loading ? "opacity-60" : "opacity-100",
  ].join(" ");

  return (
    <Modal open={open} onClose={() => {}} title="Terms and Conditions">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] text-slate-300">
            Please review and accept our terms and conditions to continue.
          </p>

          {contentLoading ? (
            <div
              className={`${scrollContainerClass} flex items-center justify-center text-slate-500`}
            >
              Loading terms...
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className={scrollContainerClass}
            >
              {termsContent}
            </div>
          )}

          {!contentLoading && !isScrolledToBottom && (
            <div className="text-xs text-[var(--accent)]">
              Please scroll down to read the complete terms
            </div>
          )}

          {error && (
            <div className="rounded bg-[rgba(244,63,94,0.1)] px-3 py-2 text-[13px] text-[var(--no)]">
              {error}
            </div>
          )}
        </div>

        <div className="mt-2 flex gap-3">
          <button
            onClick={handleAccept}
            disabled={!isScrolledToBottom || loading}
            className={acceptButtonClass}
          >
            {loading ? "Accepting..." : "Accept Terms"}
          </button>
          <button
            onClick={onLogout}
            disabled={loading}
            className="flex-1 cursor-pointer rounded border border-slate-500 bg-transparent px-4 py-2.5 text-[13px] font-semibold text-slate-500 transition-all duration-200 enabled:hover:bg-slate-500/10"
          >
            Logout
          </button>
        </div>
      </div>
    </Modal>
  );
}
