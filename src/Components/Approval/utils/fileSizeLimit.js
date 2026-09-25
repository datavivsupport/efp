import { message } from "antd";

// Largest file a user may upload as a document (any file type)
export const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * True when the file is within the upload size limit. Otherwise shows an
 * error naming the file and returns false, so the caller skips the upload.
 */
export const isWithinUploadLimit = (file) => {
  if (file?.size > MAX_UPLOAD_BYTES) {
    message.error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB and was not uploaded.`);
    return false;
  }
  return true;
};
