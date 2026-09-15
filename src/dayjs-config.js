import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Dubai");

/**
 * Serialises a date-time shown on screen (Dubai time) as the UTC instant the
 * backend stores, e.g. 08:00 Dubai -> "2026-09-15T04:00:00Z".
 *
 * Why UTC "Z" and not a bare "YYYY-MM-DD HH:mm:ss" or "+04:00": the backend reads
 * a bare placement_time as UTC and returns it as "...Z", while the pages show it
 * in Asia/Dubai — a bare string pushed the time 4 hours later on every save.
 * Sending the backend's own UTC format means a row the user didn't touch goes
 * back byte-for-byte as it came, whether or not the backend honours offsets.
 */
export const toDubaiDateTime = (value) =>
  value
    ? dayjs.tz(dayjs(value).format("YYYY-MM-DD HH:mm:ss"), "Asia/Dubai").utc().format("YYYY-MM-DDTHH:mm:ss[Z]")
    : null;

export default dayjs;
