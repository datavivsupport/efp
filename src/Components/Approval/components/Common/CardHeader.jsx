import { Space, Typography } from "antd";
import { Icon } from "@iconify/react";
import Styles from "../../Approval.module.css";

const CardHeader = ({ icon, title, open, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    }}
  >
    <Space align="center">
      <div className={Styles.mainhead}>
        <Icon icon={icon} width="18" height="18" />
      </div>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
    </Space>
    <span style={{ fontSize: 22, color: "#626161" }}>
      <Icon icon={open ? "grommet-icons:form-up" : "grommet-icons:form-down"} />
    </span>
  </div>
);

export default CardHeader;
