"use client";

import { useFormStatus } from "react-dom";

export function SaveSettingsButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 min-h-[44px] bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}
