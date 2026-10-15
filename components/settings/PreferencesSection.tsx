"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CountryCombobox } from "@/components/CountryCombobox";
import { toast } from "@/components/Toaster";
import { Section } from "@/components/settings/parts";
import { CITATION_STYLES } from "@/lib/citations";
import { getPreferences, setPreferences, type Preferences } from "@/lib/preferences";
import { applyTheme, savedThemeChoice, type ThemeChoice } from "@/lib/theme";

// Offsets are one less than the span because the year filter is inclusive.
const YEAR_OPTIONS = [
  { value: 1, label: "Last 2 years" },
  { value: 2, label: "Last 3 years" },
  { value: 4, label: "Last 5 years" },
  { value: 9, label: "Last 10 years" },
  { value: 0, label: "Any year" },
];

/** Search and citation defaults, and the theme: kept on this device, no account needed. */
export function PreferencesSection() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  useEffect(() => {
    setPrefs(getPreferences());
    setTheme(savedThemeChoice());
  }, []);

  function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setPreferences(prefs);
    toast("Preferences saved on this device", "success");
  }

  function chooseTheme(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <Section title="Preferences" description="Saved on this device. Used every time you start a search or a citation.">
      {prefs && (
        <form onSubmit={savePrefs} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pref-year" className="field-label">Default “Published since”</label>
              <select
                id="pref-year"
                value={prefs.yearsBack}
                onChange={(e) => setPrefs({ ...prefs, yearsBack: Number(e.target.value) })}
                className="input"
              >
                {YEAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pref-country" className="field-label">Default country focus</label>
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <CountryCombobox
                    id="pref-country"
                    value={prefs.country}
                    onChange={(c) => setPrefs({ ...prefs, country: c })}
                  />
                </div>
                {prefs.country && (
                  <button
                    type="button"
                    onClick={() => setPrefs({ ...prefs, country: null })}
                    className="btn-ghost btn-sm !px-2"
                    aria-label="Clear default country"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.openAccessOnly}
              onChange={(e) => setPrefs({ ...prefs, openAccessOnly: e.target.checked })}
              className="h-4 w-4"
              style={{ accentColor: "rgb(var(--accent))" }}
            />
            Show only papers with free full text by default
          </label>

          <div>
            <span className="field-label">Default citation style</span>
            <div className="seg" role="group" aria-label="Default citation style">
              {CITATION_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-on={prefs.citationStyle === s.id}
                  onClick={() => setPrefs({ ...prefs, citationStyle: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="field-label">Appearance</span>
            <div className="seg" role="group" aria-label="Appearance">
              {([
                ["light", "Light"],
                ["dark", "Dark"],
                ["system", "Match device"],
              ] as [ThemeChoice, string][]).map(([t, label]) => (
                <button key={t} type="button" data-on={theme === t} onClick={() => chooseTheme(t)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="field-hint">Applies straight away.</p>
          </div>

          <button type="submit" className="btn-primary">Save preferences</button>
        </form>
      )}
    </Section>
  );
}
