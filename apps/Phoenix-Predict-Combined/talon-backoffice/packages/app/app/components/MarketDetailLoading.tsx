interface MarketDetailLoadingProps {
  eyebrow: string;
  subtitle: string;
}

export default function MarketDetailLoading({
  eyebrow,
  subtitle,
}: MarketDetailLoadingProps) {
  return (
    <div className="flex flex-col gap-[18px] pb-10">
      <div className="rounded-[18px] border border-[#22304a] bg-[linear-gradient(135deg,#1a0a30_0%,#0f1225_50%,#0a1628_100%)] p-7 shadow-[0_24px_48px_rgba(0,0,0,0.2)]">
        <div className="mb-[18px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#D3D3D3]">
          {eyebrow}
        </div>
        <div className="flex items-center justify-between gap-5">
          <div className="h-[30px] flex-1 rounded-full bg-white/[0.08]" />
          <div className="h-[34px] w-[62px] rounded-full bg-white/[0.06]" />
          <div className="h-[30px] flex-1 rounded-full bg-white/[0.08]" />
        </div>
        <div className="mt-4 h-3 w-[220px] rounded-full bg-white/[0.06]" />
      </div>

      <div className="text-[13px] text-[#D3D3D3]">{subtitle}</div>

      {[0, 1, 2].map((group) => (
        <div
          key={group}
          className="flex flex-col gap-[14px] rounded-2xl border border-[#22304a] bg-[linear-gradient(180deg,rgba(16,22,36,0.96)_0%,rgba(10,14,25,0.98)_100%)] p-[18px]"
        >
          <div className="h-4 w-[180px] rounded-full bg-white/[0.08]" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
            {[0, 1, 2].map((cell) => (
              <div
                key={cell}
                className="flex min-h-[68px] flex-col justify-between rounded-xl border border-[#2a3245] bg-[linear-gradient(180deg,#1b2234_0%,#141a2a_100%)] p-3"
              >
                <div className="h-2.5 w-[65%] rounded-full bg-white/[0.08]" />
                <div className="h-[14px] w-[40%] rounded-full bg-[rgba(43,228,128,0.2)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
