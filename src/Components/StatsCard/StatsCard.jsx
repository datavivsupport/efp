import React from "react";
import Styles from "./StatsCard.module.css";
import { Icon } from "@iconify/react";

const StatusCards = () => {
  return (
    <div className={Styles.cardsContainer}>
      {/* Awaiting Review */}
      <div className={`${Styles.card} ${Styles.orange}`}>
        <div className={Styles.textContainer}>
          <h3 className={Styles.number}>13</h3>
          <p className={Styles.label}>AWAITING REVIEW</p>
        </div>
        <div className={Styles.iconCircle}><Icon icon="tdesign:time" /></div>
      </div>

      <div className={`${Styles.card} ${Styles.blue}`}>
        <div className={Styles.textContainer}>
          <h3 className={Styles.number}>22</h3>
          <p className={Styles.label}>TOTAL INVOICES</p>
        </div>
        <div className={Styles.iconCircle}><Icon icon="flowbite:file-invoice-solid"/></div>
      </div>

      {/* Approved By Me */}
      <div className={`${Styles.card} ${Styles.green}`}>
        <div className={Styles.textContainer}>
          <h3 className={Styles.number}>3</h3>
          <p className={Styles.label}>APPROVED BY ME</p>
        </div>
        <div className={Styles.iconCircle}><Icon icon="mdi:tick-circle-outline" /></div>
      </div>

      {/* Pending With Me */}
      <div className={`${Styles.card} ${Styles.red}`}>
        <div className={Styles.textContainer}>
          <h3 className={Styles.number}>1</h3>
          <p className={Styles.label}>PENDING WITH ME</p>
        </div>
        <div className={Styles.iconCircle}><Icon icon="mdi:alarm" /></div>
      </div>
    </div>
  );
};

export default StatusCards;