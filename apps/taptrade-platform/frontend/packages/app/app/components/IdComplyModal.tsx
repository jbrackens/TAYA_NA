"use client";

import React, { useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { uploadKycDocument } from "../lib/api/compliance-client";
import { logger } from "../lib/logger";

interface IdComplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  verificationType?: "kba" | "idpv" | "auto";
}

interface KbaQuestion {
  questionId: string;
  question: string;
  options: string[];
}

const overlayClass =
  "fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.7)]";
const modalClass =
  "w-full max-w-[480px] rounded-[16px] border border-[#1a1f3a] bg-[#111328] p-8";
const selectTitleClass = "mb-2 text-[20px] font-bold text-[#f1f5f9]";
const titleClass = "mb-4 text-[20px] font-bold text-[#f1f5f9]";
const selectCopyClass = "mb-6 text-[14px] text-[#D3D3D3]";
const errorNoticeClass =
  "mb-3 rounded-[8px] bg-[rgba(239,68,68,0.08)] p-2.5 text-[13px] text-[var(--no)]";
const selectErrorNoticeClass =
  "mb-4 rounded-[8px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] p-2.5 text-[13px] text-[var(--no)]";
const methodStackClass = "flex flex-col gap-3";
const methodButtonClass =
  "cursor-pointer rounded-[10px] border border-[#1e2243] bg-[#161a35] p-4 text-left text-[#f1f5f9] transition-[border-color] duration-150";
const methodTitleClass = "mb-1 text-[15px] font-semibold";
const methodDescriptionClass = "text-[12px] text-[#64748b]";
const secondaryActionClass =
  "mt-4 w-full cursor-pointer rounded-[8px] border border-[#1e2243] bg-transparent p-3 text-[14px] text-[#64748b]";
const backActionClass =
  "mt-2 w-full cursor-pointer rounded-[8px] border border-[#1e2243] bg-transparent p-3 text-[14px] text-[#64748b]";
const questionBlockClass = "mb-4";
const questionLabelClass =
  "mb-2 block text-[13px] font-semibold text-[#D3D3D3]";
const optionStackClass = "flex flex-col gap-1.5";
const kbaOptionClass = (selected: boolean) =>
  selected
    ? "cursor-pointer rounded-[8px] border border-[var(--accent)] bg-[rgba(43,228,128,0.1)] px-3.5 py-2.5 text-left text-[13px] text-[var(--accent)]"
    : "cursor-pointer rounded-[8px] border border-[#1e2243] bg-[#161a35] px-3.5 py-2.5 text-left text-[13px] text-[#D3D3D3]";
const primaryActionClass =
  "w-full cursor-pointer rounded-[10px] border-0 bg-[var(--accent)] p-3.5 text-[15px] font-bold text-white disabled:opacity-40";
const formFieldClass = "mb-4";
const formControlClass =
  "w-full rounded-[8px] border border-[#1e2243] bg-[#0b0e1c] px-3.5 py-2.5 text-[14px] text-[#e2e8f0]";
const fileHintClass = "mt-1.5 text-[11px] text-[#64748b]";
const centerStateClass = "py-6 text-center";
const hourglassClass = "mb-4 text-[32px]";
const iconWrapClass = "mb-4";
const bodyTextClass = "text-[14px] text-[#D3D3D3]";
const bodyTextSpacedClass = "mb-4 text-[14px] text-[#D3D3D3]";
const successTitleClass = "mb-2 text-[20px] font-bold text-[#22c55e]";
const failedTitleClass = "mb-2 text-[20px] font-bold text-[var(--no)]";
const retryButtonClass =
  "cursor-pointer rounded-[10px] border-0 bg-[var(--accent)] px-6 py-3 font-bold text-white";

/**
 * ID-Comply KBA/IDPV verification modal.
 *
 * In production, this component integrates with the ID-Comply third-party SDK
 * via a script tag injected at runtime. The SDK provides:
 *  - Knowledge-Based Authentication (KBA): presents identity questions
 *  - Identity Proofing & Verification (IDPV): document upload + selfie
 *
 * The component handles the UI flow, while the actual verification calls
 * go through our compliance API which proxies to ID-Comply.
 */
export const IdComplyModal: React.FC<IdComplyModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  verificationType: _verificationType = "auto",
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<
    "select" | "kba" | "idpv" | "upload" | "processing" | "success" | "failed"
  >("select");
  const [kbaQuestions, setKbaQuestions] = useState<KbaQuestion[]>([]);
  const [kbaAnswers, setKbaAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload documents state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("passport");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startKba = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("taptrade_access_token")
          : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/kba/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error("Failed to start KBA verification");
      const data = await res.json();
      setKbaQuestions(data.questions || []);
      setStep("kba");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start verification",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitKba = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("taptrade_access_token")
          : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/kba/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id, answers: kbaAnswers }),
      });
      if (!res.ok) throw new Error("Verification failed");
      const data = await res.json();
      if (data.verified) {
        setStep("success");
        setTimeout(() => onVerified(), 2000);
      } else {
        setStep("failed");
        setError(data.reason || "Verification could not be completed");
      }
    } catch (err) {
      setStep("failed");
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [user, kbaAnswers, onVerified]);

  const startIdpv = useCallback(async () => {
    setStep("processing");
    setError(null);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("taptrade_access_token")
          : null;
      const res = await fetch(`${apiUrl}/api/v1/compliance/idpv/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) throw new Error("Failed to start IDPV");
      const data = await res.json();

      // In production, the ID-Comply SDK opens an iframe/redirect here
      // data.redirectUrl would point to the ID-Comply hosted verification page.
      // Only follow https:// URLs (blocks javascript:/data: redirect injection)
      // and pass noopener,noreferrer so the popup can't reach back via
      // window.opener (reverse tabnabbing).
      if (data.redirectUrl && /^https:\/\//i.test(String(data.redirectUrl))) {
        window.open(
          data.redirectUrl,
          "_blank",
          "noopener,noreferrer,width=600,height=800",
        );
      }

      // Poll for verification status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${apiUrl}/api/v1/compliance/idpv/status?userId=${user?.id}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          const statusData = await statusRes.json();
          if (statusData.status === "verified") {
            clearInterval(pollInterval);
            setStep("success");
            setTimeout(() => onVerified(), 2000);
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setStep("failed");
            setError(statusData.reason || "IDPV verification failed");
          }
        } catch {
          // Continue polling
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (step === "processing") {
          setStep("failed");
          setError("Verification timed out. Please try again.");
        }
      }, 300000);
    } catch (err) {
      setStep("failed");
      setError(
        err instanceof Error ? err.message : "Failed to start verification",
      );
    }
  }, [user, onVerified, step]);

  const handleDocumentUpload = useCallback(async () => {
    if (!uploadFile || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      await uploadKycDocument(user.id, uploadFile, documentType);
      logger.info("IdComplyModal", "KYC document uploaded successfully", {
        documentType,
      });
      setStep("success");
      setTimeout(() => onVerified(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStep("failed");
      setError(message || "Document upload failed");
      logger.error("IdComplyModal", "KYC document upload failed", message);
    } finally {
      setLoading(false);
    }
  }, [uploadFile, user, documentType, onVerified]);

  if (!isOpen) return null;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        {step === "select" && (
          <>
            <h2 className={selectTitleClass}>Identity Verification</h2>
            <p className={selectCopyClass}>
              To comply with regulations, we need to verify your identity.
              Choose a verification method below.
            </p>
            {error && <div className={selectErrorNoticeClass}>{error}</div>}
            <div className={methodStackClass}>
              <button
                onClick={startKba}
                disabled={loading}
                className={methodButtonClass}
              >
                <div className={methodTitleClass}>
                  Knowledge-Based Authentication
                </div>
                <div className={methodDescriptionClass}>
                  Answer a few questions to verify your identity
                </div>
              </button>
              <button
                onClick={startIdpv}
                disabled={loading}
                className={methodButtonClass}
              >
                <div className={methodTitleClass}>Document Verification</div>
                <div className={methodDescriptionClass}>
                  Upload a government-issued ID and take a selfie
                </div>
              </button>
              <button
                onClick={() => setStep("upload")}
                disabled={loading}
                className={methodButtonClass}
              >
                <div className={methodTitleClass}>Upload Documents</div>
                <div className={methodDescriptionClass}>
                  Upload a photo of your ID, passport, or proof of address
                </div>
              </button>
            </div>
            <button onClick={onClose} className={secondaryActionClass}>
              Cancel
            </button>
          </>
        )}

        {step === "kba" && (
          <>
            <h2 className={titleClass}>Answer Verification Questions</h2>
            {kbaQuestions.map((q) => (
              <div key={q.questionId} className={questionBlockClass}>
                <label className={questionLabelClass}>{q.question}</label>
                <div className={optionStackClass}>
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setKbaAnswers((prev) => ({
                          ...prev,
                          [q.questionId]: opt,
                        }))
                      }
                      className={kbaOptionClass(
                        kbaAnswers[q.questionId] === opt,
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {error && <div className={errorNoticeClass}>{error}</div>}
            <button
              onClick={submitKba}
              disabled={
                loading || Object.keys(kbaAnswers).length < kbaQuestions.length
              }
              className={primaryActionClass}
            >
              {loading ? "Verifying..." : "Submit Answers"}
            </button>
          </>
        )}

        {step === "upload" && (
          <>
            <h2 className={titleClass}>Upload Documents</h2>
            <div className={formFieldClass}>
              <label className={questionLabelClass}>Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className={formControlClass}
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s License</option>
                <option value="national_id">National ID Card</option>
                <option value="proof_of_address">Proof of Address</option>
              </select>
            </div>
            <div className={formFieldClass}>
              <label className={questionLabelClass}>File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className={formControlClass}
              />
              <div className={fileHintClass}>
                Accepted formats: JPEG, PNG, PDF. Max size: 10MB.
              </div>
            </div>
            {error && <div className={errorNoticeClass}>{error}</div>}
            <button
              onClick={handleDocumentUpload}
              disabled={loading || !uploadFile}
              className={primaryActionClass}
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
            <button
              onClick={() => {
                setStep("select");
                setError(null);
                setUploadFile(null);
              }}
              className={backActionClass}
            >
              Back
            </button>
          </>
        )}

        {step === "processing" && (
          <div className={centerStateClass}>
            <div className={hourglassClass}>⏳</div>
            <h2 className={selectTitleClass}>Verification In Progress</h2>
            <p className={bodyTextClass}>
              Please complete the verification in the opened window. This page
              will update automatically.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className={centerStateClass}>
            <div className={iconWrapClass}>
              <CheckCircle size={48} strokeWidth={2} />
            </div>
            <h2 className={successTitleClass}>Verification Successful</h2>
            <p className={bodyTextClass}>
              Your identity has been verified. You may now continue.
            </p>
          </div>
        )}

        {step === "failed" && (
          <div className={centerStateClass}>
            <div className={iconWrapClass}>
              <XCircle size={48} strokeWidth={2} />
            </div>
            <h2 className={failedTitleClass}>Verification Failed</h2>
            <p className={bodyTextSpacedClass}>
              {error ||
                "Unable to verify your identity. Please try again or contact support."}
            </p>
            <button
              onClick={() => {
                setStep("select");
                setError(null);
              }}
              className={retryButtonClass}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdComplyModal;
