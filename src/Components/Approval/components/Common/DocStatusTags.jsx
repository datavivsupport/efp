import { Tag } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { isDocPendingApproval } from "../../utils/additionalDocs";

/**
 * Tags shown next to an LPO/Invoice file name.
 *
 * `showStatus` renders the Approved/Pending Approval tag for every LPO/Invoice
 * document, original included. `isAdditional` additionally renders the
 * "ADDITIONAL" tag, so a 2nd-phase upload stays visually distinct from the
 * original even though both now carry a status tag.
 */
const DocStatusTags = ({ file, isAdditional, showStatus }) => {
  if (!isAdditional && !showStatus) return null;
  const pending = isDocPendingApproval(file);
  return (
    <>
      {isAdditional && (
        <Tag color="gold" style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>
          ADDITIONAL
        </Tag>
      )}
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
