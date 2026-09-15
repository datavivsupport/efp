import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Dubai");

/**
 * Serialises a date-time picked on screen as Dubai time with an explicit offset,
 * e.g. "2026-09-15T08:00:00+04:00".
 *
 * Send this instead of a bare "YYYY-MM-DD HH:mm:ss": the backend reads a bare
 * placement_time as UTC, and the pages read it back into Asia/Dubai, so every
 * save pushed the time 4 hours later.
 */
export const toDubaiDateTime = (value) =>
  value ? dayjs.tz(dayjs(value).format("YYYY-MM-DD HH:mm:ss"), "Asia/Dubai").format() : null;

export default dayjs;
