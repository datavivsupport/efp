 
const StatusDot = ({ onLeave, missing }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      flex: "none",
      boxSizing: "border-box",
      background: missing ? "transparent" : onLeave ? "#ff4d4f" : "#52c41a",
      border: missing ? "1px solid #bfbfbf" : undefined,
    }}
  />
);
 
export const renderUserOption = ({ data }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <StatusDot onLeave={data.isOnLeave} missing={data.isMissing} />
    <span style={{ flex: 1, minWidth: 0 }}>{data.label}</span>
    {data.isMissing && (
      <span style={{ color: "#8c8c8c", fontSize: 12, flex: "none" }}>Not in list</span>
    )}
    {!data.isMissing && data.isOnLeave && (
      <span style={{ color: "#ff4d4f", fontSize: 12, flex: "none" }}>On leave</span>
    )}
  </span>
);

 
export const renderUserLabel = (options) => ({ label, value }) => {
  // Nothing selected: a dot beside an empty label is just noise.
  if (value === undefined || value === null || value === "") return label;

  const option = options.find((o) => o.value === value);
  const missing = !option || !!option.isMissing;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <StatusDot onLeave={option?.isOnLeave} missing={missing} />
      {label}
      {missing && (
        <span style={{ color: "#8c8c8c", fontSize: 12, flex: "none" }}>Not in list</span>
      )}
    </span>
  );
};

 
export const userOptionLabel = (user) => {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const email = user?.email || "";
  if (name && email) return `${name} | (${email})`;
  return name || email;
};

export default StatusDot;
