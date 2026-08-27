import { EyeOff, Sparkles } from "lucide-react";
import { updateCatalogFeaturedAction } from "./pengaturan/actions";

export function CatalogFeaturedToggle({ enabled }: { enabled: boolean }) {
  const options: { value: "on" | "off"; label: string; icon: typeof Sparkles }[] = [
    { value: "on", label: "Tampilkan", icon: Sparkles },
    { value: "off", label: "Sembunyikan", icon: EyeOff }
  ];

  return (
    <div className="themeToggle" role="radiogroup" aria-label="Tampilkan section Unit Rekomendasi di katalog">
      {options.map(({ value, label, icon: Icon }) => (
        <form action={updateCatalogFeaturedAction} key={value}>
          <input type="hidden" name="catalogFeatured" value={value} />
          <button
            type="submit"
            role="radio"
            aria-checked={(enabled ? "on" : "off") === value}
            className={(enabled ? "on" : "off") === value ? "themeToggleOption active" : "themeToggleOption"}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        </form>
      ))}
    </div>
  );
}
