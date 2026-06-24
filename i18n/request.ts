import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE ?? "en";
const SUPPORTED = ["en", "fr"];

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value ?? "";
  const locale = SUPPORTED.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  let messages;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    // Fallback to default locale if requested locale file is missing
    messages = (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return { locale, messages };
});
