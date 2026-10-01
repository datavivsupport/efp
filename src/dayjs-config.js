import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Dubai");
 
export const toDubaiDateTime = (value) =>
  value
    ? dayjs.tz(dayjs(value).format("YYYY-MM-DD HH:mm:ss"), "Asia/Dubai").utc().format("YYYY-MM-DDTHH:mm:ss[Z]")
    : null;

export default dayjs;
