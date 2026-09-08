import { Tag } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { isDocPendingApproval } from "../../utils/additionalDocs";

/**
 * Tags shown next to an LPO/Invoice file name.
 *
 * Only additional (2nd-phase) uploads are tagged. Original documents keep the
 * plain chip they have always had, so the tag itself is the signal that a file
 * arrived after CS HOD had already signed the job off.
 */
const DocStatusTags = ({ file, isAdditional }) => {
  if (!isAdditional) return null;
  const pending = isDocPendingApproval(file);
  return (
    <>
      <Tag color="gold" style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>
        ADDITIONAL
      </Tag>
      <Tag
        color={pending ? "orange" : "success"}
        icon={pending ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
        style={{ fontSize: 10, margin: 0, flexShrink: 0 }}
      >
        {pending ? "Pending Approval" : "Approved"}
      </Tag>
    </>
  );
};

export default DocStatusTags;
