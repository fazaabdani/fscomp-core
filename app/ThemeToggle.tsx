import { Gem, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/lib/app-settings";
import { updateThemeAction } from "./pengaturan/actions";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "elegant", label: "Elegan", icon: Gem }
];

export function ThemeToggle({ current }: { current: ThemePreference }) {
  return (
    <div className="themeToggle" role="radiogroup" aria-label="Pilih tema tampilan">
      {options.map(({ value, label, icon: Icon }) => (
        <form action={updateThemeAction} key={value}>
          <input type="hidden" name="theme" value={value} />
          <button
            type="submit"
            role="radio"
            aria-checked={current === value}
            className={current === value ? "themeToggleOption active" : "themeToggleOption"}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        </form>
      ))}
    </div>
  );
}
