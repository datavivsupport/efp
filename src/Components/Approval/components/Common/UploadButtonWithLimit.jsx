import { Space, Typography } from "antd";
import { MAX_UPLOAD_MB } from "../../utils/fileSizeLimit";

/**
 * Upload control + the "Max N MB" note beside it (same note Sales Input shows).
 * The note is left out while the upload is disabled - the user can't pick a file then.
 */
const UploadButtonWithLimit = ({ disabled = false, children }) => (
  <Space size={8} wrap>
    {children}
    {!disabled && (
      <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        Max {MAX_UPLOAD_MB} MB
      </Typography.Text>
    )}
  </Space>
);

export default UploadButtonWithLimit;
