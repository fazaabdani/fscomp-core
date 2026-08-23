import { PanelLeft, PanelTop } from "lucide-react";
import type { LayoutPreference } from "@/lib/app-settings";
import { updateLayoutAction } from "./pengaturan/actions";

const options: { value: LayoutPreference; label: string; icon: typeof PanelTop }[] = [
  { value: "topbar", label: "Topbar", icon: PanelTop },
  { value: "sidebar", label: "Sidebar", icon: PanelLeft }
];

export function LayoutToggle({ current }: { current: LayoutPreference }) {
  return (
    <div className="themeToggle" role="radiogroup" aria-label="Pilih mode menu">
      {options.map(({ value, label, icon: Icon }) => (
        <form action={updateLayoutAction} key={value}>
          <input type="hidden" name="layout" value={value} />
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
