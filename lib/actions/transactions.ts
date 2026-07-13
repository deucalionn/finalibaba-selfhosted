"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertCsvImportEligible } from "@/lib/actions/csv-import-guard";

type ImportRow = { date: string; label: string; amountCents: number };

export async function importTransactions(accountId: string, rows: ImportRow[]) {
  if (rows.length === 0) return { imported: 0 };
  await assertCsvImportEligible(accountId);

  const data = rows.map((r) => ({
    accountId,
    syncId: `csv_${randomUUID()}`,
    // Noon UTC keeps the date stable across timezones instead of risking a
    // midnight-UTC day shift — same convention as importBalanceHistory.
    date: new Date(`${r.date}T12:00:00.000Z`),
    label: r.label.slice(0, 500),
    amountCents: BigInt(Math.round(r.amountCents)),
  }));

  const result = await prisma.transaction.createMany({ data });

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/");

  return { imported: result.count };
}
