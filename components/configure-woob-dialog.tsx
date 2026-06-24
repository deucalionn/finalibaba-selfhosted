"use client";

import { useState, useTransition } from "react";
import { Settings2, RefreshCw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { setWoobConfig, clearWoobConfig } from "@/lib/actions/institutions";
import { useTranslations } from "next-intl";

const WOOB_MODULES = [
  { module: "lcl", label: "LCL" },
  { module: "bnporc", label: "BNP Paribas" },
  { module: "caissedepargne", label: "Caisse d'Épargne" },
  { module: "societegenerale", label: "Société Générale" },
  { module: "creditagricole", label: "Crédit Agricole" },
  { module: "boursorama", label: "Boursorama" },
  { module: "fortuneo", label: "Fortuneo" },
  { module: "hellobank", label: "Hello Bank!" },
  { module: "ing", label: "ING France" },
  { module: "bforbank", label: "BforBank" },
  { module: "monabanq", label: "Monabanq" },
  { module: "hsbc", label: "HSBC France" },
  { module: "banquepostale", label: "La Banque Postale" },
  { module: "cic", label: "CIC" },
  { module: "creditdunord", label: "Crédit du Nord" },
  { module: "linxea", label: "Linxea" },
  { module: "degiro", label: "DEGIRO" },
] as const;

interface Props {
  institutionId: string;
  institutionName: string;
  currentModule?: string | null;
}

export function ConfigureWoobDialog({ institutionId, institutionName, currentModule }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [module, setModule] = useState(currentModule ?? "");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("configureWoob");
  const tc = useTranslations("common");

  const isConfigured = !!currentModule;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!module || !login || !password) return;
    setError(null);
    startTransition(async () => {
      try {
        await setWoobConfig(institutionId, module, login, password);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("unknownError"));
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearWoobConfig(institutionId);
      setModule("");
      setLogin("");
      setPassword("");
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); setError(null); }}
      title={t("title", { name: institutionName })}
      trigger={
        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 min-h-[44px] rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
          <Settings2 size={12} aria-hidden="true" />
          {isConfigured ? t("configured") : t("configure")}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[var(--muted)]">{t("woobHint")}</p>

        <div className="space-y-1.5">
          <label htmlFor="woob-module" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {t("module")}
          </label>
          <select
            id="woob-module"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            required
            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 cursor-pointer"
          >
            <option value="">{t("select")}</option>
            {WOOB_MODULES.map((m) => (
              <option key={m.module} value={m.module}>{m.label}</option>
            ))}
            <option value="__custom__">{t("other")}</option>
          </select>
          {module === "__custom__" && (
            <input
              type="text"
              aria-label={t("moduleAriaLabel")}
              placeholder="module_name"
              onChange={(e) => setModule(e.target.value === "__custom__" ? "" : e.target.value)}
              className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 mt-1.5"
            />
          )}
          <p className="text-xs text-[var(--muted)] opacity-70">
            {t.rich("listHint", {
              code: (chunks) => <code className="text-[var(--foreground)]">{chunks}</code>,
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="woob-login" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {t("login")}
          </label>
          <input
            id="woob-login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder={isConfigured ? t("keepExisting") : ""}
            autoComplete="username"
            required={!isConfigured}
            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="woob-password" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {t("password")}
          </label>
          <input
            id="woob-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isConfigured ? t("keepExisting") : ""}
            autoComplete="current-password"
            required={!isConfigured}
            className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        {error && <p role="alert" className="text-xs text-[var(--negative)]">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isConfigured && (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--negative)]/40 text-[var(--negative)] hover:bg-[var(--negative)]/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} aria-hidden="true" />
              {t("deleteConfig")}
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending || !module || module === "__custom__"}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pending && <RefreshCw size={12} className="animate-spin" aria-hidden="true" />}
              {isConfigured ? t("update") : t("submit")}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
