"use client";

interface TabsProps {
  tabs: { label: string; key: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-[#1a1f3a]">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative cursor-pointer whitespace-nowrap border-x-0 border-t-0 border-b-2 border-solid bg-transparent px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "mb-[-1px] border-b-[var(--accent)] text-[var(--accent)]"
                : "border-b-transparent text-[#64748b] hover:text-[#cbd5e1]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
