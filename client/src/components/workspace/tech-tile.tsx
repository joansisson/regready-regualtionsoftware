import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TechTileProps = {
  name: string;
  isSelected: boolean;
  /**
   * simple-icons slug (e.g. "aws", "azure", "github").
   * Rendered via simple-icons CDN. If missing/invalid, tile falls back to initials.
   */
  iconSlug?: string;
  onToggle: () => void;
};

function TechIcon({ name, iconSlug }: { name: string; iconSlug?: string }) {
  if (!iconSlug) {
    return <span className="text-xs font-bold text-neutral-600">{name.slice(0, 2).toUpperCase()}</span>;
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${iconSlug}`}
      alt={name}
      className="h-6 w-6"
      loading="lazy"
      onError={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.currentTarget as any).style.display = "none";
      }}
    />
  );
}

export default function TechTile({ name, isSelected, iconSlug, onToggle }: TechTileProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-sm",
        "flex items-center gap-3",
        "bg-white",
        isSelected
          ? "border-primary/80 ring-2 ring-primary/25"
          : "border-neutral-200 hover:border-primary/40",
      )}
      aria-pressed={isSelected}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border",
          isSelected ? "border-primary/40 bg-primary/5" : "border-neutral-200 bg-neutral-50",
        )}
      >
        <TechIcon name={name} iconSlug={iconSlug} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-neutral-900 truncate">{name}</span>
      </span>

      {isSelected && (
        <span className="flex items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 h-7 w-7">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
