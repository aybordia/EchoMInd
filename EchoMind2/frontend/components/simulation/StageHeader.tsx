interface StageHeaderProps {
  title: string;
  equation?: string;
  badges?: string[];
}

/** Glass overlay shown at the top of every simulation stage. */
export function StageHeader({ title, equation, badges }: StageHeaderProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold tracking-tight text-foreground/95 sm:text-lg">
          {title}
        </h3>
        {equation && (
          <span className="glass-panel rounded-full px-3 py-1 font-mono text-xs text-accent-soft">
            {equation}
          </span>
        )}
      </div>
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges
            .filter(Boolean)
            .map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-foreground-muted"
              >
                {badge}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
