"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

type ImportRow = { date: string; label: string; amountCents: number };

export async function importTransactions(accountId: string, rows: ImportRow[]) {
  if (rows.length === 0) return { imported: 0 };

  const data = rows.map((r) => ({
    accountId,
    syncId: `csv_${randomUUID()}`,
    date: new Date(r.date),
    label: r.label.slice(0, 500),
    amountCents: BigInt(Math.round(r.amountCents)),
  }));

  const result = await prisma.transaction.createMany({ data });

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/accounts");
  revalidatePath("/");

  return { imported: result.count };
}
