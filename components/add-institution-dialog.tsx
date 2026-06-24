"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createInstitution } from "@/lib/actions/institutions";
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

const inputClass =
  "w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30";

export function AddInstitutionDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedModule, setSelectedModule] = useState("");
  const [customName, setCustomName] = useState("");
  const t = useTranslations("addInstitution");
  const tc = useTranslations("common");

  const knownBank = WOOB_MODULES.find((m) => m.module === selectedModule);
  const isCustom = selectedModule === "__other__";
  const woobEnabled = !!knownBank;

  const reset = () => {
    setSelectedModule("");
    setCustomName("");
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Ensure name is set (auto from known bank or custom input)
    if (!fd.get("name")) return;
    startTransition(async () => {
      await createInstitution(fd);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}
      title={t("title")}
      trigger={
        <Button>
          <Plus size={14} aria-hidden="true" />
          {t("trigger")}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="inst-bank" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {t("bank")}
          </label>
          <select
            id="inst-bank"
            value={selectedModule}
            onChange={(e) => { setSelectedModule(e.target.value); setCustomName(""); }}
            className={`${inputClass} cursor-pointer`}
            required
          >
            <option value="">{t("select")}</option>
            {WOOB_MODULES.map((m) => (
              <option key={m.module} value={m.module}>{m.label}</option>
            ))}
            <option value="__other__">{t("other")}</option>
          </select>
        </div>

        {knownBank && (
          <input type="hidden" name="name" value={knownBank.label} />
        )}

        {isCustom && (
          <div className="space-y-1.5">
            <label htmlFor="inst-name" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
              {t("name")}
            </label>
            <input
              id="inst-name"
              type="text"
              name="name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Revolut, Trade Republic…"
              required
              className={inputClass}
            />
          </div>
        )}

        {woobEnabled && (
          <>
            <input type="hidden" name="woobModule" value={selectedModule} />
            <div className="space-y-3 pt-1 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] pt-1">{t("woobHint")}</p>
              <div className="space-y-1.5">
                <label htmlFor="inst-woob-login" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t("login")}
                </label>
                <input
                  id="inst-woob-login"
                  type="text"
                  name="woobLogin"
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="inst-woob-password" className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t("password")}
                </label>
                <input
                  id="inst-woob-password"
                  type="password"
                  name="woobPassword"
                  autoComplete="current-password"
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        {selectedModule && (
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("creating") : t("submit")}
            </Button>
          </div>
        )}
      </form>
    </Dialog>
  );
}
