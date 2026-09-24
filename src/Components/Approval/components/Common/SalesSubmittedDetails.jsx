import { useState } from "react";
import { Card, Checkbox, Col, Input, Row, Tag } from "antd";
import dayjs from "../../../../dayjs-config";
import CardHeader from "./CardHeader";
import Styles from "../../Approval.module.css";

/*
 * Read-only copy of what the Sales Executive filled in on the Sales Input form —
 * same sections, labels, order and values — so an approver sees exactly the
 * submitted details.
 *
 * Display only: plain inputs with `value`, no Form.Item names, so it never adds
 * to or changes the page's form values or payloads.
 */

const Field = ({ label, value, span = 6, multiline = false }) => (
  <Col xs={24} md={span}>
    <div className={Styles.roField}>
      <label>{label}</label>
      {multiline
        ? <Input.TextArea value={value ?? ""} disabled autoSize={{ minRows: 1 }} className={Styles.textAreaField} />
        : <Input value={value ?? ""} disabled />}
    </div>
  </Col>
);

const Section = ({ icon, title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <Card className={Styles.card} variant="outlined" title={<CardHeader icon={icon} title={title} open={open} onToggle={() => setOpen((o) => !o)} />}>
      <div style={{ display: open ? "block" : "none" }}>{children}</div>
    </Card>
  );
};

/**
 * @param jobData   the job as returned by the API
 * @param documents optional node listing the Sales Executive's uploaded files
 *                  (the page passes its own file list so preview works as elsewhere)
 */
const SalesSubmittedDetails = ({ jobData, documents }) => {
  if (!jobData) return null;
  const jobType = (jobData.job_type || "").toUpperCase();
  const isLiner = jobType === "LINER";
  const isCrossTrade = jobType === "CROSS TRADE" || jobType === "CROSS_TRADE";
  const commodities = (jobData.commodities || []).map((c) => c?.name).filter(Boolean);
  const containers = jobData.container_details || [];
  const otherCharges = jobData.approval_details?.other_charges_remarks
    || (jobData.approval_details?.other_charges || []).join(", ");

  return (
    <>
      <Section icon="basil:document-solid" title="JOB HEADER">
        <Row gutter={16}>
          <Field label="Job" value={jobType} />
          <Field label="Export Number" value={jobData.export_number || "N/A"} />
          <Field label="Created Date" value={jobData.export_created_date ? dayjs(jobData.export_created_date).format("DD-MM-YYYY") : ""} />
          <Field label="Created By" value={jobData.created_by_name} />
        </Row>
      </Section>

      <Section icon="mdi:account-details-outline" title="BASIC INFORMATION">
        <Row gutter={16}>
          <Field label="Carrier Name" value={jobData.carrier_name} />
          <Field label="Customer Name" value={jobData.customer_name} />
          <Field label="Contact PIC" value={jobData.contact_pic} />
          <Col xs={24} md={6}>
            <div className={Styles.roField}>
              <label>Commodity</label>
              <div className={Styles.roTags}>
                {commodities.length ? commodities.map((c) => <Tag key={c} color="cyan">{c}</Tag>) : <span className={Styles.roEmpty}>—</span>}
              </div>
            </div>
          </Col>
          <Field label="E-mail" value={jobData.email} />
          <Field label="Phone" value={jobData.phone_no} />
          <Field label="Agent" value={jobData.agent} />
        </Row>
      </Section>

      <Section icon="octicon:container-24" title="CONTAINER DETAILS">
        {containers.length === 0 && <div className={Styles.roEmpty}>No container rows.</div>}
        {containers.map((c, i) => (
          <Row gutter={16} key={c.id ?? i}>
            <Field label="Equipment Type" value={c.equipment_type} span={5} />
            <Field label="Volume" value={c.quantity} span={4} />
            <Field label="Category" value={c.category} span={5} />
            <Field label="Quote" value={c.quote} span={5} />
            <Field label="Cost" value={c.cost} span={5} />
          </Row>
        ))}
        <Row gutter={16}>
          <Field label="Other Charges" value={otherCharges} span={24} multiline />
        </Row>
      </Section>

      <Section icon="mingcute:ship-fill" title="SHIPMENT DETAILS">
        <Row gutter={16}>
          <Field label="Port Of Loading" value={jobData.port_of_loading} />
          <Field label="Port Of Discharge" value={jobData.port_of_discharge} />
          <Field label="Final Port Of Discharge" value={jobData.final_pod} />
          <Field label="Terms of Shipment" value={jobData.terms_of_shipment} />
          <Field label="Haulier Code" value={jobData.haulier_code} />
          <Field label="Remarks" value={jobData.remarks} span={18} multiline />
          <Col xs={24}>
            <div className={Styles.roChecks}>
              {!isLiner && <Checkbox checked={!!jobData.hbl} disabled>HBL</Checkbox>}
              <Checkbox checked={!!jobData.fac} disabled>HCS</Checkbox>
              <Checkbox checked={!!jobData.documentation} disabled>DOCUMENTATION</Checkbox>
              {!isCrossTrade && <Checkbox checked={!!jobData.transportation} disabled>TRANSPORTATION</Checkbox>}
            </div>
          </Col>
          <Field label="Special Instruction If Any" value={jobData.special_instructions} span={24} multiline />
          <Field label="Name of Executive" value={jobData.name_of_executive} span={12} />
          <Field label="Name of Sales HOD" value={jobData.sales_hod} span={12} />
        </Row>
      </Section>

      {documents && (
        <Section icon="mdi:paperclip" title="SALES EXECUTIVE ATTACHMENTS">
          {documents}
        </Section>
      )}
    </>
  );
};

export default SalesSubmittedDetails;
