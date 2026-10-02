export function SectionHeading({
  index,
  title,
  accent,
  right,
}: {
  index: string;
  title: string;
  accent?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="num mb-3 flex items-center gap-3 text-[11px] tracking-[0.35em] text-[#79715F]">
          <span className="text-[#1C6B4A]">{index}</span>
          <span className="h-px w-10 bg-[#D9D1C0]" />
          {accent ?? "SYSTEM MODULE"}
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-[#1C1A13] md:text-5xl">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}
