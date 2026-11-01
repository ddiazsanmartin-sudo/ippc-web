/** Todas las fechas se muestran en hora de Chile continental, sin importar dónde se genere el build. */
export const TIME_ZONE = 'America/Santiago';
const LOCALE = 'es-CL';

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });

const longDate = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const longDateYear = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const time = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const day = fmt({ day: 'numeric' });
const monthShort = fmt({ month: 'short' });
const monthYear = fmt({ month: 'long', year: 'numeric' });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatLongDate = (d: Date) => capitalize(longDate.format(d));
export const formatDateYear = (d: Date) => longDateYear.format(d);
export const formatTime = (d: Date) => `${time.format(d)} hrs`;
export const formatDay = (d: Date) => day.format(d);
export const formatMonthShort = (d: Date) => monthShort.format(d).replace('.', '');
export const formatMonthYear = (d: Date) => capitalize(monthYear.format(d));

/** Las fechas sin hora (p. ej. sermones) se guardan a medianoche UTC: se formatean en UTC para no "retroceder" un día. */
export const formatCalendarDate = (d: Date) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(d);

interface Dated {
  data: { fecha: Date; fecha_fin?: Date | undefined; publicado?: boolean };
}

/** Fin efectivo de una actividad: su fecha de término o, si no tiene, 3 horas después del inicio. */
export const endOf = (e: Dated) => e.data.fecha_fin ?? new Date(e.data.fecha.getTime() + 3 * 3600_000);

export function splitByTime<T extends Dated>(items: T[], now = new Date()) {
  const visible = items.filter((e) => e.data.publicado !== false);
  const upcoming = visible.filter((e) => endOf(e) >= now).sort((a, b) => a.data.fecha.getTime() - b.data.fecha.getTime());
  const past = visible.filter((e) => endOf(e) < now).sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
  return { upcoming, past };
}
