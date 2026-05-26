"use client";

import { useRef, useState } from "react";

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

  const inputClass = [
    "box-border h-12 w-12 rounded-md border-2 bg-[#0f1225] text-center text-xl font-semibold text-slate-200 transition-all duration-200 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(43,228,128,0.1)] focus:outline-none",
    error ? "border-red-500" : "border-[#1a1f3a]",
    disabled ? "cursor-not-allowed opacity-60" : "cursor-text",
  ].join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center gap-3">
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
              className={inputClass}
              disabled={disabled}
              maxLength={1}
            />
          ))}
      </div>

      {error && <div className="text-[13px] text-[var(--no)]">{error}</div>}
    </div>
  );
}
