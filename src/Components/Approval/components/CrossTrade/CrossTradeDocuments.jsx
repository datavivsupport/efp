import { Card, Form, Switch, Tag, Typography, message } from "antd";
import { Icon } from "@iconify/react";
import CardHeader from "../Common/CardHeader";
import Styles from "../../Approval.module.css";



const GuardedSwitch = ({ checked, onChange, hasFiles, disabled, ...rest }) => (
  <Switch
    {...rest}
    size="small"
    checkedChildren="Yes"
    unCheckedChildren="No"
    checked={!!checked}
    disabled={disabled}
    onChange={(next, e) => {
      if (!next && checked && hasFiles) {
        message.warning("Delete the file first to choose No.");
        return;
      }
      onChange?.(next, e);
    }}
  />
);

export const RequirementSwitch = ({ name, value, disabled = false, hasFiles = false }) => {
  if (name) {
    return (
      <Form.Item name={name} valuePropName="checked" noStyle>
        <GuardedSwitch hasFiles={hasFiles} disabled={disabled} />
      </Form.Item>
    );
  }
  return <Switch size="small" checkedChildren="Yes" unCheckedChildren="No" checked={!!value} disabled />;
};

const RULE_TAG = {
  required: { color: "error", text: "Required" },
  notRequired: { color: "default", text: "Not required" },
  optional: { color: "default", text: "Optional" },
};

/**
 * One document slot.
 * @param label    document name
 * @param rule     "required" | "notRequired" | "optional"
 * @param toggle   { label, node } — the Yes/No selector, or omitted
 * @param hint     short status line under the slot
 * @param children upload field / file list / select supplied by the page
 */
export const DocSlot = ({ label, rule, toggle, hint, warn = false, children }) => {
  const tag = RULE_TAG[rule];
  return (
    <div className={Styles.docSlot}>
      <div className={Styles.docSlotHead}>
        <div className={Styles.docSlotName}>
          <span>{label}</span>
          {tag && <Tag color={tag.color} style={{ margin: 0 }}>{tag.text}</Tag>}
        </div>
        {toggle && (
          <div className={Styles.docSlotToggle}>
            <span>{toggle.label}</span>
            {toggle.node}
          </div>
        )}
      </div>
      {children}
      {hint && <div className={warn ? `${Styles.docSlotHint} ${Styles.docSlotHintWarn}` : Styles.docSlotHint}>{hint}</div>}
    </div>
  );
};



export const Gate = ({ step, title, description, locked = false, lockedMessage, children }) => (
  <div className={`${Styles.gate} ${locked ? Styles.gateLocked : ""}`}>
    <div className={Styles.gateHead}>
      {step && <span className={Styles.gateStep}>{step}</span>}
      <div style={{ minWidth: 0 }}>
        <Typography.Text strong className={Styles.gateTitle}>{title}</Typography.Text>
        {description && <div className={Styles.gateDesc}>{description}</div>}
      </div>
      {locked && (
        <Tag style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon icon="mdi:lock-outline" />
          View only
        </Tag>
      )}
    </div>
    {locked && lockedMessage && <div className={Styles.gateLockedMsg}>{lockedMessage}</div>}
    <div className={Styles.gateGrid}>{children}</div>
  </div>
);

/** Card wrapper with the collapsible header used on every Approval page. */
const CrossTradeDocuments = ({ open, onToggle, title = "CROSS TRADE DOCUMENTS", children }) => (
  <Card className={Styles.card} variant="outlined" title={<CardHeader icon="mdi:file-document-multiple-outline" title={title} open={open} onToggle={onToggle} />}>
    <div style={{ display: open ? "block" : "none" }}>{children}</div>
  </Card>
);

export default CrossTradeDocuments;
