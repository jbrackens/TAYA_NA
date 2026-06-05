"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export default function OpenChatButton() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Always visible after mount (SSR guard)
    setIsVisible(true);
  }, []);

  const handleClick = () => {
    // Open external support chat
    const chatUrl =
      process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL ||
      "https://support.tiangge.com/chat";
    window.open(chatUrl, "supportChat", "width=800,height=600");
  };

  return (
    <div
      className={`group fixed bottom-[90px] right-6 z-[999] transition-opacity duration-300 ${
        isVisible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1a1f3a] px-3 py-1.5 text-xs font-semibold text-[#e2e8f0] opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-opacity duration-200 group-hover:opacity-100">
        Need Help?
      </div>
      <button
        onClick={handleClick}
        className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--accent)] text-[#0f1225] shadow-[0_4px_12px_rgba(43,228,128,0.3)] transition-all duration-300 hover:scale-110 hover:bg-[#ea580c] hover:shadow-[0_6px_16px_rgba(43,228,128,0.4)]"
        title="Need Help?"
      >
        <MessageCircle className="h-6 w-6" strokeWidth={2} />
      </button>
    </div>
  );
}
