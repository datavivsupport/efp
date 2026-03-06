import { useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Table,
  Upload,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Card,
  Badge,
  Checkbox,
  message,
  Modal,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Icon } from "@iconify/react";
import Styles from "./approval.module.css";
import EquipmentTypeSelect from "../SalesInput/EquipmentType";
import CategorySelect from "../SalesInput/Category";
import { uploadFile } from "../Viewer/UploadUtil";
import MultiFileViewer from "../Viewer/MultiFileViewer";

const { TextArea } = Input;
const { Option } = Select;

// How many chips to show before "See more"
const VISIBLE_LIMIT = 2;

const STATUS_COLOR = {
  Approved: "success",
  Pending: "warning",
  Rejected: "error",
  "In Progress": "processing",
};

/* ── Collapsible Card Header ── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   FileChipList — shared chip renderer for every upload field
   Shows up to VISIBLE_LIMIT chips + "+N more" button.
   onPreview(localIdx) — caller decides which file array to show in modal.
───────────────────────────────────────────────────────────────────────────── */
const FileChipList = ({ files, color = "blue", onRemove, onPreview }) => {
  const visible = files.slice(0, VISIBLE_LIMIT);
  const hidden = files.slice(VISIBLE_LIMIT);

  return (
    <Space wrap style={{ marginTop: 6, marginBottom: 4, flexWrap: "wrap" }}>
      {visible.map((file, i) => (
        <Tag
          key={i}
          closable
          color={color}
          icon={<PaperClipOutlined />}
          onClose={() => onRemove(i)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            maxWidth: 220,
          }}
        >
          <span
            style={{
              maxWidth: 110,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </span>
          <Button
            type="link"
            size="small"
            style={{ padding: "0 2px", height: "auto", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(i);
            }}
          >
            Preview
          </Button>
        </Tag>
      ))}

      {hidden.length > 0 && (
        <Button
          size="small"
          type="dashed"
          icon={<EyeOutlined />}
          onClick={() => onPreview(VISIBLE_LIMIT)}
          style={{ fontSize: 11, borderRadius: 20 }}
        >
          +{hidden.length} more
        </Button>
      )}
    </Space>
  );
};

/* DocUploadField — self-contained upload + chip-list for a single doc slot.
   Each instance has its own isolated file array; nothing is shared.

   Props:
     label      — button label suffix
     files      — { name, url }[]
     setFiles   — state setter
     color      — Tag color string
     onPreview  — (filesArray, localIdx) => void */

const DocUploadField = ({
  label,
  files,
  setFiles,
  color = "purple",
  onPreview,
}) => {
  const handleBeforeUpload = async (file) => {
    try {
      const url = await uploadFile([{ originFileObj: file }]);
      setFiles((prev) => [...prev, { name: file.name, url }]);
      message.success(`${file.name} uploaded`);
    } catch {
      message.error("Upload failed");
    }
    return false;
  };

  return (
    <div>
      <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
        <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }}>
          {files.length === 0 ? `Upload ${label}` : "Add More"}
        </Button>
      </Upload>

      {files.length > 0 && (
        <FileChipList
          files={files}
          color={color}
          onRemove={(i) => setFiles((p) => p.filter((_, j) => j !== i))}
          onPreview={(i) => onPreview(files, i)}
        />
      )}
    </div>
  );
};

/* MAIN COMPONENT */
const Approval = () => {
  const [form] = Form.useForm();

  /* ── Collapse state ── */
  const [open, setOpen] = useState({
    export: true,
    container: true,
    otherDetails: true,
    placement: true,
    booking: true,
    bankAccounts: true,
    documents: true,
    attachments: true,
    approvalStatus: true,
  });
  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  /* ── Shared preview modal ──
     openPreview(filesArray, localIdx) — receives the exact array to show.
     Each field passes its own isolated array so the sidebar never mixes lists.
  ── */
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const openPreview = (filesArray, localIdx) => {
    const urls = filesArray.map((f) => f.url).filter(Boolean);
    if (!urls.length) return;
    setPreviewUrls(urls);
    setPreviewIndex(Math.max(0, Math.min(localIdx, urls.length - 1)));
    setPreviewVisible(true);
  };

  /* ── File states — every field is 100% independent ── */
  // Bank slip section
  const [bankSlips, setBankSlips] = useState([]);

  // Booking section — 4 separate lists
  const [releaseOrderFiles, setReleaseOrderFiles] = useState([]);
  const [bocFiles, setBocFiles] = useState([]);
  const [haulageCostFiles, setHaulageCostFiles] = useState([]);
  const [loadListFiles, setLoadListFiles] = useState([]);

  // Documents section — 3 separate lists
  const [lpoFiles, setLpoFiles] = useState([]);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [facFiles, setFacFiles] = useState([]);

  // Attachments & Comments section
  const [attachments, setAttachments] = useState([]);

  /* ── Other state ── */
  const [otherCharges, setOtherCharges] = useState([]);
  const [chargeInput, setChargeInput] = useState("");
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");

  /* ── Static approval rows ── */
  const approvalRows = [
    {
      id: 1,
      stage: "Pending SalesHOD and CSV Updation Team Approval",
      pendingWith: "CSVUpdation",
      updatedBy: "Gouthaman T (CSV)",
      status: "Approved",
      updatedDate: "2025-11-03",
    },
  ];

  /* ── Handlers ── */
  const addOtherCharge = () => {
    const v = chargeInput.trim();
    if (!v) return;
    if (!otherCharges.find((c) => c.toLowerCase() === v.toLowerCase()))
      setOtherCharges((p) => [...p, v]);
    setChargeInput("");
  };

  const addRemark = () => {
    if (!newRemark.trim()) return;
    setRemarks((p) => [...p, newRemark]);
    setNewRemark("");
  };

  const handleUploadBankSlip = async (file) => {
    try {
      const url = await uploadFile([{ originFileObj: file }]);
      setBankSlips((prev) => [...prev, { name: file.name, url }]);
      message.success(`${file.name} uploaded`);
    } catch {
      message.error("Upload failed");
    }
    return false;
  };

  const handleUploadAttachment = async (file) => {
    try {
      const url = await uploadFile([{ originFileObj: file }]);
      setAttachments((prev) => [...prev, { name: file.name, url }]);
      message.success(`${file.name} uploaded`);
    } catch {
      message.error("Upload failed");
    }
    return false;
  };

  const onFinish = (values) => {
    const payload = {
      exportdetails: {
        exportNumber: values?.exportNumber || "",
        exportCreatedDate: values?.exportCreatedDate || "",
        exportCreatedBy: values?.exportCreatedBy || "",
        carrierName: values?.carrierName || "",
        customerName: values?.customerName || "",
        contactDetails: values?.contactDetails || "",
      },
      containerDetails: {
        containerRows: values?.containerRows || [],
        otherCharges,
      },
      otherDetails: {
        portofloading: values?.pol || "",
        portofdischarge: values?.pod || "",
        finalpod: values?.fpod || "",
        termsOfShipment: values?.termsOfShipment || "",
        haulierCode: values?.haulierCode || "",
        hbl: values?.hbl || false,
        fac: values?.fac || false,
        documentation: values?.documentation || false,
        transportation: values?.transportation || false,
        executiveName: values?.executiveName || "",
        specialRemarks: values?.specialRemarks || "",
      },
      placementDetails: values?.placementRows || [],
      bookingDetails: {
        afsysJobNo: values?.afsysJobNo || "",
        bookingVessel: values?.bookingVessel || "",
        bookingVoyage: values?.bookingVoyage || "",
        vesselETA: values?.vesselETA || "",
        bookingRefNo: values?.bookingRefNo || "",
        siCutOffDate: values?.siCutOffDate || "",
        siCutOffTime: values?.siCutOffTime || "",
        bookingRemarks: values?.bookingRemarks || "",
        cnfRemarks: values?.cnfRemarks || "",
        releaseOrderFiles,
        bocFiles,
        haulageCostFiles,
        loadListFiles,
      },
      documents: { lpoFiles, invoiceFiles, facFiles },
      bankslipandaccount: {
        bankSlips,
        accountRemarks: values?.accountRemarks || "",
      },
      attachmentsandcomments: { attachments, remarks },
    };
    message.success("Form saved successfully");
  };

  const handleReset = () => {
    form.resetFields();
    setOtherCharges([]);
    setRemarks([]);
    setAttachments([]);
    setBankSlips([]);
    setReleaseOrderFiles([]);
    setBocFiles([]);
    setHaulageCostFiles([]);
    setLoadListFiles([]);
    setLpoFiles([]);
    setInvoiceFiles([]);
    setFacFiles([]);
    message.info("Form reset");
  };

  /* ── Table columns ── */
  const approvalColumns = [
    { title: "Stage", dataIndex: "stage", key: "stage" },
    { title: "Pending With", dataIndex: "pendingWith", key: "pendingWith" },
    { title: "Updated By", dataIndex: "updatedBy", key: "updatedBy" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Badge status={STATUS_COLOR[s.trim()] || "default"} text={s} />
      ),
    },
    { title: "Updated Date", dataIndex: "updatedDate", key: "updatedDate" },
  ];

  /* RENDER */
  return (
    <div style={{ padding: "10px 20px", backgroundColor: "#eff8ff" }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        onFinishFailed={() =>
          message.error("Please fill in all required fields")
        }
      >
        {/* ════════ EXPORT DETAILS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="basil:document-solid"
              title="EXPORT DETAILS"
              open={open.export}
              onToggle={() => toggle("export")}
            />
          }
        >
          <div style={{ display: open.export ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Number"
                  name="exportNumber"
                >
                  <Input placeholder="Please Select Job Type" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Created Date"
                  name="exportCreatedDate"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Created By"
                  name="exportCreatedBy"
                >
                  <Input placeholder="Created By" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Carrier Name"
                  name="carrierName"
                >
                  <Input placeholder="Carrier Name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Customer Name"
                  name="customerName"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Customer Name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact PIC"
                  name="contactPIC"
                >
                  <Input placeholder="Contact PIC" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact Details"
                  name="contactDetails"
                >
                  <Input placeholder="Phone / Email" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Commodity"
                  name="commodity"
                >
                  <Input placeholder="Commodity" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ CONTAINER DETAILS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="octicon:container-24"
              title="CONTAINER DETAILS"
              open={open.container}
              onToggle={() => toggle("container")}
            />
          }
        >
          <div style={{ display: open.container ? "block" : "none" }}>
            <Form.List name="containerRows" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Row gutter={16} key={key} align="middle">
                      <Col xs={24} md={5}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "equipmentType"]}
                          label="Equipment Type"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <EquipmentTypeSelect />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "volume"]}
                          label="Volume"
                        >
                          <Input placeholder="Qty" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={5}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "category"]}
                          label="Category"
                        >
                          <CategorySelect />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "quote"]}
                          label="Quote"
                        >
                          <Input placeholder="Quote" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "cost"]}
                          label="Cost"
                        >
                          <Input placeholder="Cost" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={1}>
                        <Button
                          danger
                          style={{ marginTop: "1rem" }}
                          disabled={fields.length <= 1}
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      </Col>
                      <Col xs={24} md={1}>
                        <Button
                          type="primary"
                          style={{ marginTop: "1rem" }}
                          icon={<PlusOutlined />}
                          onClick={() => add()}
                        />
                      </Col>
                    </Row>
                  ))}
                </>
              )}
            </Form.List>

            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col xs={24}>
                <Form.Item className={Styles.formLabel} label="Other Charges">
                  <div className={Styles.chipBox}>
                    <Space
                      wrap
                      style={{ marginBottom: otherCharges.length ? 6 : 0 }}
                    >
                      {otherCharges.map((c, i) => (
                        <Tag
                          key={i}
                          closable
                          color="cyan"
                          onClose={() =>
                            setOtherCharges((p) => p.filter((_, j) => j !== i))
                          }
                        >
                          {c}
                        </Tag>
                      ))}
                    </Space>
                    <Input
                      bordered={false}
                      placeholder="Type a charge and press Enter…"
                      value={chargeInput}
                      onChange={(e) => setChargeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addOtherCharge();
                        }
                      }}
                      style={{ padding: 0 }}
                    />
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ OTHER DETAILS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mingcute:ship-fill"
              title="OTHER DETAILS"
              open={open.otherDetails}
              onToggle={() => toggle("otherDetails")}
            />
          }
        >
          <div style={{ display: open.otherDetails ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="POL"
                  name="pol"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Loading" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="POD"
                  name="pod"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Discharge" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="FPOD"
                  name="fpod"
                >
                  <Input placeholder="Final Port of Discharge" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Terms of Shipment"
                  name="termsOfShipment"
                >
                  <Select placeholder="Select Terms" allowClear>
                    <Option value="prepaid">Prepaid</Option>
                    <Option value="collect">Collect</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Haulier Code"
                  name="haulierCode"
                >
                  <Input placeholder="Enter Code" />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Name of Executive"
                  name="executiveName"
                >
                  <Input placeholder="Sales Executive" />
                </Form.Item>
              </Col>
              <Col xs={12} md={12}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Special Instruction if Any"
                  name="specialRemarks"
                >
                  <TextArea
                    placeholder="Enter any special instructions…"
                    // autoSize={{ minRows: 2 }}
                  />
                </Form.Item>
              </Col>
              {[
                ["hbl", "HBL"],
                ["fac", "FAC"],
                ["documentation", "Documentation"],
                ["transportation", "Transportation"],
              ].map(([n, l]) => (
                <Col xs={12} md={6} key={n}>
                  <Form.Item name={n} valuePropName="checked" noStyle>
                    <Checkbox>{l}</Checkbox>
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </div>
        </Card>

        {/* ════════ PLACEMENT DETAILS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="hugeicons:delivery-truck-02"
              title="PLACEMENT DETAILS"
              open={open.placement}
              onToggle={() => toggle("placement")}
            />
          }
        >
          <div style={{ display: open.placement ? "block" : "none" }}>
            <Form.List name="placementRows" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Row gutter={16} key={key} align="middle">
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "equipmentType"]}
                          label="Equipment Type"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <EquipmentTypeSelect />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={3}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "volume"]}
                          label="Volume"
                        >
                          <Input placeholder="Qty" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "category"]}
                          label="Category"
                        >
                          <CategorySelect />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "date"]}
                          label="Date"
                        >
                          <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={3}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "time"]}
                          label="Time"
                        >
                          <TimePicker
                            style={{ width: "100%" }}
                            format="HH:mm"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...rest}
                          name={[name, "remarks"]}
                          label="Remarks"
                        >
                          <Input placeholder="Remarks" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={1}>
                        <Button
                          danger
                          style={{ marginTop: "1rem" }}
                          disabled={fields.length <= 1}
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      </Col>
                      <Col xs={24} md={1}>
                        <Button
                          type="primary"
                          style={{ marginTop: "1rem" }}
                          icon={<PlusOutlined />}
                          onClick={() => add()}
                        />
                      </Col>
                    </Row>
                  ))}
                </>
              )}
            </Form.List>
          </div>
        </Card>

        {/* ════════ BOOKING DETAILS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mdi:anchor"
              title="BOOKING DETAILS"
              open={open.booking}
              onToggle={() => toggle("booking")}
            />
          }
        >
          <div style={{ display: open.booking ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="AFSYS Job No."
                  name="afsysJobNo"
                >
                  <Input placeholder="Afsys Job No." />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Booking Vessel"
                  name="bookingVessel"
                >
                  <Input placeholder="Booking Vessel" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Booking Voyage"
                  name="bookingVoyage"
                >
                  <Input placeholder="Booking Voyage" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Vessel ETA Date"
                  name="vesselETA"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Booking Reference No."
                  name="bookingRefNo"
                >
                  <Input placeholder="Booking Reference No." />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Load List/SI Cut Off Date"
                  name="siCutOffDate"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Load List/SI Cut Off Time"
                  name="siCutOffTime"
                >
                  <TimePicker style={{ width: "100%" }} format="HH:mm" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Booking Remarks"
                  name="bookingRemarks"
                >
                  <TextArea
                    autoSize={{ minRows: 1 }}
                    placeholder="Enter Remarks"
                  />
                </Form.Item>
              </Col>

              {/* Release Order From Carrier — own isolated list */}
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Release Order From Carrier"
                >
                  <DocUploadField
                    label="Release Order"
                    files={releaseOrderFiles}
                    setFiles={setReleaseOrderFiles}
                    color="geekblue"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>

              {/* BOC Attachment — own isolated list */}
              <Col xs={24} md={6}>
                <Form.Item className={Styles.formLabel} label="BOC Attachment">
                  <DocUploadField
                    label="BOC"
                    files={bocFiles}
                    setFiles={setBocFiles}
                    color="volcano"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>

              {/* Haulage Cost Sheet — own isolated list */}
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Haulage Cost Sheet"
                >
                  <DocUploadField
                    label="Haulage Cost Sheet"
                    files={haulageCostFiles}
                    setFiles={setHaulageCostFiles}
                    color="orange"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>

              {/* Load List — own isolated list */}
              <Col xs={24} md={6}>
                <Form.Item className={Styles.formLabel} label="Load List">
                  <DocUploadField
                    label="Load List"
                    files={loadListFiles}
                    setFiles={setLoadListFiles}
                    color="gold"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={24}>
                <Form.Item
                  className={Styles.formLabel}
                  label="CNF Remarks"
                  name="cnfRemarks"
                >
                  <TextArea placeholder="Enter Remarks" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ BANK SLIP & ACCOUNT REMARKS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mdi:bank-outline"
              title="BANK SLIP & ACCOUNT REMARKS"
              open={open.bankAccounts}
              onToggle={() => toggle("bankAccounts")}
            />
          }
        >
          <div style={{ display: open.bankAccounts ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item className={Styles.formLabel} label="Bank Slip(s)">
                  <Upload
                    multiple
                    showUploadList={false}
                    beforeUpload={handleUploadBankSlip}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      style={{ marginBottom: bankSlips.length ? 6 : 0 }}
                    >
                      Upload Bank Slip
                    </Button>
                  </Upload>
                  {bankSlips.length > 0 && (
                    <FileChipList
                      files={bankSlips}
                      color="green"
                      onRemove={(i) =>
                        setBankSlips((p) => p.filter((_, j) => j !== i))
                      }
                      onPreview={(i) => openPreview(bankSlips, i)}
                    />
                  )}
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Account Remarks"
                  name="accountRemarks"
                >
                  <TextArea
                    autoSize={{ minRows: 3 }}
                    placeholder="Enter account remarks…"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ DOCUMENTS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mdi:file-document-multiple-outline"
              title="DOCUMENTS"
              open={open.documents}
              onToggle={() => toggle("documents")}
            />
          }
        >
          <div style={{ display: open.documents ? "block" : "none" }}>
            <Row gutter={16}>
              {/* LPO — own isolated list */}
              <Col xs={24} md={8}>
                <Form.Item className={Styles.formLabel} label="LPO">
                  <DocUploadField
                    label="LPO"
                    files={lpoFiles}
                    setFiles={setLpoFiles}
                    color="cyan"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>

              {/* INVOICE — own isolated list */}
              <Col xs={24} md={8}>
                <Form.Item className={Styles.formLabel} label="INVOICE">
                  <DocUploadField
                    label="Invoice"
                    files={invoiceFiles}
                    setFiles={setInvoiceFiles}
                    color="purple"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>

              {/* FAC — own isolated list */}
              <Col xs={24} md={8}>
                <Form.Item className={Styles.formLabel} label="FAC">
                  <DocUploadField
                    label="FAC"
                    files={facFiles}
                    setFiles={setFacFiles}
                    color="magenta"
                    onPreview={openPreview}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ ATTACHMENTS & COMMENTS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mdi:comment-text-multiple-outline"
              title="ATTACHMENTS AND COMMENTS"
              open={open.attachments}
              onToggle={() => toggle("attachments")}
            />
          }
        >
          <div style={{ display: open.attachments ? "block" : "none" }}>
            <Row gutter={32}>
              {/* Remarks */}
              <Col xs={24} md={12}>
                <span className={Styles.sectionLabel}>REMARKS</span>
                {remarks.map((r, i) => (
                  <div key={i} className={Styles.remarkItem}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ position: "absolute", top: 6, right: 6 }}
                      onClick={() =>
                        setRemarks((p) => p.filter((_, j) => j !== i))
                      }
                    />
                    <p style={{ paddingRight: 24, margin: 0 }}>{r}</p>
                  </div>
                ))}
                <span className={Styles.sectionLabel} style={{ marginTop: 12 }}>
                  ADD REMARKS
                </span>
                <TextArea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Enter your remarks here…"
                  autoSize={{ minRows: 3 }}
                  style={{ marginBottom: 10 }}
                />
                <Button
                  type="primary"
                  onClick={addRemark}
                  icon={<PlusOutlined />}
                >
                  Add Remark
                </Button>
              </Col>

              {/* Attachments */}
              <Col xs={24} md={12}>
                <span className={Styles.sectionLabel}>ATTACHMENTS</span>
                {attachments.length > 0 && (
                  <FileChipList
                    files={attachments}
                    color="blue"
                    onRemove={(i) =>
                      setAttachments((p) => p.filter((_, j) => j !== i))
                    }
                    onPreview={(i) => openPreview(attachments, i)}
                  />
                )}
                <span
                  className={Styles.sectionLabel}
                  style={{ display: "block", marginTop: 10 }}
                >
                  ADD ATTACHMENTS
                </span>
                <Upload
                  multiple
                  showUploadList={false}
                  beforeUpload={handleUploadAttachment}
                >
                  <div className={Styles.dropZone}>
                    <Space>
                      <span style={{ margin: "40px" }}>
                        <PaperClipOutlined /> Choose Files
                      </span>
                    </Space>
                  </div>
                </Upload>
              </Col>
            </Row>
          </div>
        </Card>

        {/* ════════ APPROVAL STATUS ════════ */}
        <Card
          className={Styles.card}
          bordered
          title={
            <CardHeader
              icon="mdi:check-decagram-outline"
              title="APPROVAL STATUS"
              open={open.approvalStatus}
              onToggle={() => toggle("approvalStatus")}
            />
          }
        >
          <div style={{ display: open.approvalStatus ? "block" : "none" }}>
            <Table
              dataSource={approvalRows}
              columns={approvalColumns}
              rowKey="id"
              pagination={false}
              scroll={{ x: "max-content" }}
              size="small"
            />
          </div>
        </Card>

        {/* ════════ ACTION BUTTONS ════════ */}
        <Space
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginTop: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          <Button
            type="primary"
            htmlType="submit"
            icon={<Icon icon="mdi:tick-circle" />}
          >
            Save Approval
          </Button>
          <Button
            type="primary"
            icon={<Icon icon="tabler:refresh" />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Space>
      </Form>

      {/* ════════ PREVIEW MODAL ════════
          Each field passes its own isolated array to openPreview,
          so the sidebar shows only that field's files — never mixed.
      ════════════════════════════════ */}
      <Modal
        open={previewVisible}
        footer={null}
        title={"Attachments"}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: "87vh", padding: 0 } }}
        destroyOnClose
      >
        {previewVisible && previewUrls.length > 0 && (
          <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />
        )}
      </Modal>
    </div>
  );
};

export default Approval;
