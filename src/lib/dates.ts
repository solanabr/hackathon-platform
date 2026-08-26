const TZ = "America/Sao_Paulo";

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ });

/** "05 set" */
export const DAY_MONTH = fmt({ day: "2-digit", month: "short" });
/** "05 set 2026" */
export const DAY_MONTH_YEAR = fmt({ day: "2-digit", month: "short", year: "numeric" });
/** "05 de setembro" */
export const DAY_MONTH_LONG = fmt({ day: "2-digit", month: "long" });
/** "05 set 14:00" */
export const DAY_MONTH_TIME = fmt({ day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
/** "05 de setembro às 14:00" */
export const DAY_MONTH_LONG_TIME = fmt({ day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
/** "05/09" */
export const DAY_NUMERIC = fmt({ day: "2-digit", month: "2-digit" });
/** "05/09 14:00" */
export const DATE_TIME_NUMERIC = fmt({ day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
/** "14:00" */
export const TIME_HM = fmt({ hour: "2-digit", minute: "2-digit" });

/** pt-BR month abbreviations carry a trailing period ("set.") that the layouts drop. */
export function stripPeriods(s: string): string {
  return s.replace(/\./g, "");
}
