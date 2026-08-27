import type { LayoutPreference, ThemePreference } from "@/lib/app-settings";
import { CatalogFeaturedToggle } from "../CatalogFeaturedToggle";
import { LayoutToggle } from "../LayoutToggle";
import { ThemeToggle } from "../ThemeToggle";

export function SettingsPanel({
  theme,
  layout,
  catalogFeaturedEnabled
}: {
  theme: ThemePreference;
  layout: LayoutPreference;
  catalogFeaturedEnabled: boolean;
}) {
  return (
    <div className="settingsPanel">
      <div className="settingsPanelGroup">
        <p className="eyebrow">Tema</p>
        <ThemeToggle current={theme} />
      </div>
      <div className="settingsPanelGroup">
        <p className="eyebrow">Posisi menu</p>
        <LayoutToggle current={layout} />
      </div>
      <div className="settingsPanelGroup">
        <p className="eyebrow">Unit Rekomendasi di Katalog</p>
        <CatalogFeaturedToggle enabled={catalogFeaturedEnabled} />
      </div>
    </div>
  );
}
