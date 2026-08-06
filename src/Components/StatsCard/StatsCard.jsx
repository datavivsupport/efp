import React from "react";
import Styles from "./StatsCard.module.css";
import { Icon } from "@iconify/react";

const CARDS = [
  { status: "submitted", color: "orange", label: "AWAITING REVIEW", icon: "tdesign:time", key: "pending" },
  { status: "", color: "blue", label: "TOTAL SALES", icon: "mdi:chart-timeline-variant-shimmer", key: "total" },
  { status: "approved", color: "green", label: "APPROVED BY ME", icon: "mdi:tick-circle-outline", key: "approved" },
  { status: "draft", color: "red", label: "PENDING WITH ME", icon: "mdi:alarm", key: "overdue" },
];

const StatusCards = ({
  stats = { pending: 0, total: 0, approved: 0, overdue: 0 },
  activeStatus = "",
  onSelect,
}) => {
  return (
    <div className={Styles.cardsContainer}>
      {CARDS.map(({ status, color, label, icon, key }) => (
        <div
          key={label}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect ? () => onSelect(status) : undefined}
          onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(status); } } : undefined}
          className={`${Styles.card} ${Styles[color]} ${onSelect ? Styles.clickable : ""} ${activeStatus === status ? Styles.selected : ""}`}
        >
          <div className={Styles.textContainer}>
            <p className={Styles.label}>{label}</p>
            <h3 className={Styles.number}>{stats[key] || 0}</h3>
          </div>
          <div className={Styles.iconCircle}><Icon icon={icon} /></div>
        </div>
      ))}
    </div>
  );
};

export default StatusCards;
