import React from "react";
import Styles from "./StatsCard.module.css";
import { Icon } from "@iconify/react";

const StatusCards = ({ stats = { pending: 0, total: 0, approved: 0, overdue: 0 } }) => {
  return (
    <div className={Styles.cardsContainer}>
      {/* Awaiting Review */}
      <div className={`${Styles.card} ${Styles.orange}`}>
        <div className={Styles.textContainer}>
          <p className={Styles.label}>AWAITING REVIEW</p>
          <h3 className={Styles.number}>{stats.pending}</h3>
        </div>
        <div className={Styles.iconCircle}><Icon icon="tdesign:time" /></div>
      </div>

      <div className={`${Styles.card} ${Styles.blue}`}>
        <div className={Styles.textContainer}>
          <p className={Styles.label}>TOTAL SALES</p>
          <h3 className={Styles.number}>{stats.total}</h3>
        </div>
        <div className={Styles.iconCircle}><Icon icon="mdi:chart-timeline-variant-shimmer" /></div>
      </div>

      {/* Approved By Me */}
      <div className={`${Styles.card} ${Styles.green}`}>
        <div className={Styles.textContainer}>
          <p className={Styles.label}>APPROVED BY ME</p>

          <h3 className={Styles.number}>{stats.approved}</h3>
        </div>
        <div className={Styles.iconCircle}><Icon icon="mdi:tick-circle-outline" /></div>
      </div>

      {/* Pending With Me */}
      <div className={`${Styles.card} ${Styles.red}`}>
        <div className={Styles.textContainer}>
          <p className={Styles.label}>PENDING WITH ME</p>
          <h3 className={Styles.number}>{stats.overdue || 0}</h3>
        </div>
        <div className={Styles.iconCircle}><Icon icon="mdi:alarm" /></div>
      </div>
    </div>
  );
};

export default StatusCards;