import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import apiClient from "../../api/apiclient";

const EXPORT_URL = "/liner/sales-input/reports/export/";
const MESSAGE_KEY = "report-export";
const POLL_INTERVAL_MS = 2000;
// Just past the backend's task time limit (16 min), so a stuck job cannot spin forever.
const MAX_WAIT_MS = 17 * 60 * 1000;
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiMessage = (error, fallback) => error?.response?.data?.message || fallback;

// The file comes from a presigned S3 URL that answers with Content-Disposition:
// attachment, so navigating to it downloads the file and leaves this page in place.
const downloadFile = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Starts the Excel export of the reports list in the background and downloads the file
 * once the server has built it.
 *
 * `startExport(params)` takes the same filter params the list API takes (no page /
 * page_size); an empty object exports every record.
 */
const useReportExport = () => {
  const [exporting, setExporting] = useState(false);
  const activeRef = useRef(false);

  // Leaving the page ends the poll loop (it checks activeRef after every wait).
  useEffect(() => () => {
    activeRef.current = false;
    message.destroy(MESSAGE_KEY);
  }, []);

  const finish = useCallback((type, text) => {
    activeRef.current = false;
    setExporting(false);
    message[type]({ content: text, key: MESSAGE_KEY, duration: 4 });
  }, []);

  const waitForFile = useCallback(async (taskId) => {
    const startedAt = Date.now();
    let failures = 0;

    while (activeRef.current) {
      await sleep(POLL_INTERVAL_MS);
      if (!activeRef.current) return;

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        finish("error", "Export is taking longer than expected. Please try again.");
        return;
      }

      try {
        const { data: body } = await apiClient.get(`${EXPORT_URL}status/${taskId}/`, {
          skipErrorHandler: true,
        });
        if (!activeRef.current) return;
        failures = 0;

        const job = body?.data;
        if (job?.status === "completed") {
          downloadFile(job.download_url, job.filename);
          finish("success", `Export ready (${job.row_count} records)`);
          return;
        }
        if (job?.status === "failed") {
          finish("error", job.message || "Export failed. Please try again.");
          return;
        }
      } catch (error) {
        if (!activeRef.current) return;
        // A 404 means the job is gone (expired or never ours); anything else is treated
        // as a blip and retried a few times before giving up.
        failures += 1;
        if (error?.response?.status === 404 || failures >= MAX_CONSECUTIVE_POLL_ERRORS) {
          finish("error", apiMessage(error, "Could not fetch export status."));
          return;
        }
      }
    }
  }, [finish]);

  const startExport = useCallback(async (params = {}) => {
    if (activeRef.current) return;
    activeRef.current = true;
    setExporting(true);
    message.loading({ content: "Preparing Excel export...", key: MESSAGE_KEY, duration: 0 });

    try {
      const { data: body } = await apiClient.post(EXPORT_URL, params, { skipErrorHandler: true });
      if (!activeRef.current) return;
      await waitForFile(body.data.task_id);
    } catch (error) {
      if (!activeRef.current) return;
      finish("error", apiMessage(error, "Could not start the export."));
    }
  }, [waitForFile, finish]);

  return { exporting, startExport };
};

export default useReportExport;
