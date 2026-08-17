 
const StatusDot = ({ onLeave }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      flex: "none",
      background: onLeave ? "#ff4d4f" : "#52c41a",
    }}
  />
);
 
export const renderUserOption = ({ data }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <StatusDot onLeave={data.isOnLeave} />
    <span style={{ flex: 1, minWidth: 0 }}>{data.label}</span>
    {data.isOnLeave && (
      <span style={{ color: "#ff4d4f", fontSize: 12, flex: "none" }}>On leave</span>
    )}
  </span>
);

 
export const renderUserLabel = (options) => ({ label, value }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <StatusDot onLeave={options.find((o) => o.value === value)?.isOnLeave} />
    {label}
  </span>
);

export default StatusDot;
