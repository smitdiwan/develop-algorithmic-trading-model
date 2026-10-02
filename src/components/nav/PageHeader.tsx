export function PageHeader({
  index,
  accent,
  title,
  blurb,
  right,
}: {
  index: string;
  accent: string;
  title: string;
  blurb: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-8 border-b border-[#D9D1C0] pb-8">
      <div className="num mb-3 flex items-center gap-3 text-[11px] tracking-[0.35em] text-[#79715F]">
        <span className="text-[#1C6B4A]">{index}</span>
        <span className="h-px w-10 bg-[#D9D1C0]" />
        {accent}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1C1A13] md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#5A5344]">{blurb}</p>
        </div>
        {right}
      </div>
    </div>
  );
}
