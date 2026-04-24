"use client";

import React, { useRef, useState, useEffect } from "react";

interface CodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function CodeInput({
  length = 6,
  onComplete,
  error,
  disabled = false,
}: CodeInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(length).fill(null),
  );

  const handleInput = (index: number, value: string) => {
    if (disabled) return;

    const digit = value.slice(-1);
    if (!/^\d*$/.test(digit)) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== "")) {
      onComplete(newCode.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").split("").slice(0, length);

    const newCode = [...code];
    digits.forEach((digit, idx) => {
      newCode[idx] = digit;
    });
    setCode(newCode);

    if (digits.length === length) {
      onComplete(newCode.join(""));
    } else if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, length - 1)]?.focus();
    }
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const inputsContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  };

  const getInputStyle = (index: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: "48px",
      height: "48px",
      fontSize: "20px",
      fontWeight: "600",
      color: "#e2e8f0",
      textAlign: "center",
      backgroundColor: "#0f1225",
      border: error ? "2px solid #ef4444" : "2px solid #1a1f3a",
      borderRadius: "6px",
      cursor: disabled ? "not-allowed" : "text",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s",
      boxSizing: "border-box",
    };

    return baseStyle;
  };

  const errorStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--no)",
  };

  return (
    <div style={containerStyle}>
      <div style={inputsContainerStyle}>
        {Array(length)
          .fill(0)
          .map((_, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              value={code[index]}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => {
                if (!disabled) {
                  const el = e.currentTarget as HTMLInputElement;
                  el.style.borderColor = "var(--accent)";
                  el.style.boxShadow = "0 0 0 3px rgba(43, 228, 128, 0.1)";
                }
              }}
              onBlur={(e) => {
                const el = e.currentTarget as HTMLInputElement;
                el.style.borderColor = error ? "#ef4444" : "#1a1f3a";
                el.style.boxShadow = "none";
              }}
              style={getInputStyle(index)}
              disabled={disabled}
              maxLength={1}
            />
          ))}
      </div>

      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}
