import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Checkbox,
  DatePicker,
  Space,
  Typography,
  Card,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Styles from "./salesinput.module.css";
import { Icon } from "@iconify/react";
import { useNavigate, useSearchParams } from "react-router";
import CategorySelect from "./Category";
import EquipmentTypeSelect from "./EquipmentType";
import apiClient from "../../api/apiclient";

// const { Title } = Typography;
const { TextArea } = Input;

const SalesInput = () => {
  const [form] = Form.useForm();

  const [commodities, setCommodities] = useState([]);
  const [commodityInput, setCommodityInput] = useState("");

  const [equipmentRows, setEquipmentRows] = useState([
    { id: 1, equipmentType: "", volume: "", category: "", quote: "", cost: "" },
  ]);

  const [transportationRows, setTransportationRows] = useState([
    {
      id: 1,
      equipmentType: "",
      container: "",
      category: "",
      date: "",
      location: "",
      remarks: "",
    },
  ]);

  const [additionalService, setAdditionalService] = useState({
    showTransportation: false,
    hbl: false,
    fac: false,
    documentation: false,
  });

  const [showBasicInformation, setShowBasicInformation] = useState(true);
  const [showAdditionalService, setShowAdditionalService] = useState(true);
  const [showShipmentDetails, setShowShipmentDetails] = useState(true);
  const [showContainerDetails, setShowContainerDetails] = useState(true);
  const [showExportDetails, setShowExportDetails] = useState(true);
  const [showApprovers, setShowApprovers] = useState(true);
  const [showSpecialInstructions, setShowSpecialInstructions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState("1"); // Added for read-only check
  const [workflowStatus, setWorkflowStatus] = useState({
    is_hod_approved: false,
    is_cs_updated: false,
    is_cnf_loadlist_uploaded: false,
    is_financial_trigger_activated: false,
  });
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const user = useSelector((state) => state.auth.user);

  const userRoles = (user?.roles || []).map(r => r.name.toLowerCase());
  const isHOD = userRoles.includes("hod");
  const isExecutive = userRoles.includes("executive");
  const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");

  // Executive/Admin can edit at all stages. HOD is read-only unless they are also an Executive/Admin.
  const isReadOnly = !isAdmin && !isExecutive && (isHOD || (currentStage && parseInt(currentStage) > 1));

  const addCommodity = () => {
    if (commodityInput.trim() && !commodities.includes(commodityInput.trim())) {
      setCommodities([...commodities, commodityInput.trim()]);
      setCommodityInput("");
    }
  };

  const removeCommodity = (value) => {
    setCommodities(commodities.filter((c) => c !== value));
  };

  // const addEquipmentRow = () => {
  //   setEquipmentRows([
  //     ...equipmentRows,
  //     {
  //       id: Date.now(),
  //       equipmentType: "",
  //       volume: "",
  //       category: "",
  //       quote: "",
  //       cost: "",
  //     },
  //   ]);
  // };

  // const removeEquipmentRow = (id) => {
  //   if (equipmentRows.length > 1) {
  //     setEquipmentRows(equipmentRows.filter((row) => row.id !== id));
  //   }
  // };

  // const addTransportRow = () => {
  //   setTransportationRows([
  //     ...transportationRows,
  //     {
  //       id: Date.now(),
  //       equipmentType: "",
  //       container: "",
  //       category: "",
  //       date: "",
  //       location: "",
  //       remarks: "",
  //     },
  //   ]);
  // };

  // const removeTransportRow = (id) => {
  //   if (transportationRows.length > 1) {
  //     setTransportationRows(transportationRows.filter((row) => row.id !== id));
  //   }
  // };

  // const totals = equipmentRows.reduce(
  //   (acc, row) => {
  //     const quote = Number(row.quote) || 0;
  //     const cost = Number(row.cost) || 0;
  //     const volume = Number(row.volume) || 0;
  //     acc.quote += quote;
  //     acc.cost += cost;
  //     acc.margin += volume * (quote - cost);
  //     return acc;
  //   },
  //   { quote: 0, cost: 0, margin: 0 },
  // );
  useEffect(() => {
    const fetchDraftData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await apiClient.get(`/liner/sales-input/${id}/`);
        if (response.status === 200) {
          const data = response.data.data;
          setCurrentStage(data.current_stage || "1");
          setWorkflowStatus({
            is_hod_approved: data.is_hod_approved,
            is_cs_updated: data.is_cs_updated,
            is_cnf_loadlist_uploaded: data.is_cnf_loadlist_uploaded,
            is_financial_trigger_activated: data.is_financial_trigger_activated,
          });

          // Map backend data to form fields
          form.setFieldsValue({
            customer_name: data.customer_name,
            contact_pic: data.contact_pic,
            phone_no: data.phone_no,
            email: data.email,
            job_type: data.job_type,
            agent: data.agent,
            carrier_name: data.carrier_name,
            port_of_loading: data.port_of_loading,
            port_of_discharge: data.port_of_discharge,
            final_pod: data.final_pod,
            terms_of_shipment: data.terms_of_shipment,
            haulier_code: data.haulier_code,
            name_of_executive: data.name_of_executive,
            sales_hod: data.sales_hod,
            special_instructions: data.special_instructions,
            other_charges_remarks: data.approval_details?.other_charges_remarks,
            export_created_date: data.export_created_date ? dayjs(data.export_created_date) : dayjs(),
            export_number: data.export_number || "N/A",
            created_by_name: data.created_by_name || "",
            lpo_required: data.approval_details?.lpo_required ?? true,
            release_order_required: data.approval_details?.release_order_required ?? true,
          });

          // Set state for dynamic lists
          setCommodities((data.commodities || []).map(c => c.name));

          const mappedEquipment = (data.container_details || []).map((cd, index) => ({
            id: cd.id || index + 1,
            equipment_type: cd.equipment_type,
            quantity: cd.quantity,
            category: cd.category,
            quote: cd.quote,
            cost: cd.cost
          }));

          if (mappedEquipment.length > 0) {
            setEquipmentRows(mappedEquipment);
            form.setFieldsValue({ equipmentRows: mappedEquipment });
          }

          const mappedTransportation = (data.transportation_rows || []).map((tr, index) => ({
            id: tr.id || index + 1,
            equipment_type: tr.equipment_type,
            no_of_containers: tr.no_of_containers,
            category: tr.category,
            placement_time: tr.placement_time ? dayjs(tr.placement_time) : null,
            pickup_location: tr.pickup_location,
            special_remarks: tr.special_remarks
          }));

          if (mappedTransportation.length > 0) {
            setTransportationRows(mappedTransportation);
            form.setFieldsValue({ transportationRows: mappedTransportation });
            setAdditionalService(prev => ({ ...prev, showTransportation: true }));
          }

          setAdditionalService(prev => ({
            ...prev,
            hbl: data.hbl,
            fac: data.fac,
            documentation: data.documentation
          }));
        }
      } catch (error) {
        console.error("Error fetching draft data:", error);
        message.error("Failed to load draft data");
      } finally {
        setLoading(false);
      }
    };

    fetchDraftData();
  }, [id, form]);

  const onFinish = async (values, statusValue = "submitted") => {
    setLoading(true);
    const cleanEquipment = (values.equipmentRows || []).map((row) => ({
      equipment_type: row?.equipment_type || "",
      quantity: Number(row?.quantity) || 0,
      category: row?.category || "",
      quote: row?.quote || "",
      cost: row?.cost || "",
    }));

    const cleanTransportation = (values.transportationRows || []).map(
      (row) => ({
        equipment_type: row?.equipment_type || "",
        no_of_containers: Number(row?.no_of_containers) || 0,
        category: row?.category || "",
        placement_time: row?.placement_time
          ? row.placement_time.format("YYYY-MM-DD HH:mm:ss")
          : null,
        pickup_location: row?.pickup_location || "",
        special_remarks: row?.special_remarks || "",
      }),
    );

    // Auto-include any typed but not-yet-Enter-pressed commodity text
    const allCommodities = [...(commodities || [])];
    if (commodityInput && commodityInput.trim() && !allCommodities.includes(commodityInput.trim())) {
      allCommodities.push(commodityInput.trim());
    }

    const payload = {
      customer_name: values?.customer_name || "",
      contact_pic: values?.contact_pic || "",
      phone_no: values?.phone_no || "",
      email: values?.email || "",
      job_type: values?.job_type || "liner",
      agent: values?.agent || "",
      carrier_name: values?.carrier_name || "",
      port_of_loading: values?.port_of_loading || "",
      port_of_discharge: values?.port_of_discharge || "",
      final_pod: values?.final_pod || "",
      terms_of_shipment: values?.terms_of_shipment || "",
      haulier_code: values?.haulier_code || "",
      hbl: additionalService.hbl || false,
      fac: additionalService.fac || false,
      documentation: additionalService.documentation || false,
      transportation: additionalService.showTransportation || false,
      name_of_executive: values?.name_of_executive || "",
      sales_hod: values?.sales_hod || "",
      special_instructions: values?.special_instructions || "",
      approval_details: {
        other_charges_remarks: values?.other_charges_remarks || "",
        lpo_required: values?.lpo_required ?? true,
        release_order_required: values?.release_order_required ?? true,
      },
      status: statusValue,
      commodities: allCommodities.map((c) => ({ name: c })),
      container_details: cleanEquipment || [],
      transportation_rows: additionalService.showTransportation
        ? cleanTransportation || []
        : [],
      export_created_date: values.export_created_date ? values.export_created_date.format("YYYY-MM-DD") : null,
      export_number: values.export_number !== "N/A" ? values.export_number : null,
    };

    try {
      const payloadWithUser = {
        ...payload,
        created_by_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : payload.created_by_name
      };

      const response = id
        ? await apiClient.put(`/liner/sales-input/${id}/`, payloadWithUser)
        : await apiClient.post("/liner/sales-input/", payloadWithUser);

      if (response.status === 201 || response.status === 200) {
        message.success(`Form ${statusValue === 'draft' ? 'Saved' : 'Submitted'} Successfully`);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishFailed = () => {
    message.error("Please fill in all required fields");
  };

  const handleCancel = () => {
    form.resetFields();
    setCommodities([]);
    setEquipmentRows([
      {
        id: 1,
        equipment_type: "",
        quantity: "",
        category: "",
        quote: "",
        cost: "",
      },
    ]);
    setTransportationRows([
      {
        id: 1,
        equipment_type: "",
        no_of_containers: "",
        category: "",
        placement_time: "",
        pickup_location: "",
        special_remarks: "",
      },
    ]);
    setAdditionalService(prev => ({ ...prev, showTransportation: false }));
  };

  const navigate = useNavigate();

  return (
    <div style={{ padding: "10px 20px", backgroundColor: "#eff8ff" }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        onFinishFailed={handleFinishFailed}
        initialValues={{
          export_created_date: dayjs(),
          created_by_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "",
        }}
      >
        {/* EXPORT DETAILS / HEADER */}
        <Card
          className={Styles.card}
          bordered
          title={
            <div
              onClick={() => setShowExportDetails((prev) => !prev)}
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
                  <Icon icon="basil:document-solid" width="18" height="18" />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  JOB HEADER
                </Typography.Title>
              </Space>

              <span style={{ fontSize: 22, color: "#626161" }}>
                {showExportDetails ? (
                  <Icon icon="grommet-icons:form-up" />
                ) : (
                  <Icon icon="grommet-icons:form-down" />
                )}
              </span>
            </div>
          }
        >
          <div style={{ display: showExportDetails ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Job Type"
                  name="job_type"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select
                    placeholder="Select Job Type"
                    allowClear
                    disabled={isReadOnly}
                  >
                    <Select.Option value="forwarding">Forwarding</Select.Option>
                    <Select.Option value="liner">Liner</Select.Option>
                    <Select.Option value="cross-trade">Cross Trade</Select.Option>
                    <Select.Option value="others">Others</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Number"
                  name="export_number"
                >
                  <Input disabled placeholder="N/A" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Created Date"
                  name="export_created_date"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    disabled={isReadOnly || true} // Created Date is usually system-managed or locked
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Created By"
                  name="created_by_name"
                >
                  <Input disabled={isReadOnly || true} placeholder="Enter Export Created By" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

        {/* WORKFLOW STATUS (Parallel Indicators) */}
        {parseInt(currentStage) > 1 && (
          <Card className={Styles.card} bordered title="WORKFLOW STATUS">
            <Row gutter={16} justify="space-around">
              <Col>
                <Space direction="vertical" align="center">
                  <Icon
                    icon={workflowStatus.is_hod_approved ? "mdi:check-circle" : "mdi:clock-outline"}
                    color={workflowStatus.is_hod_approved ? "#52c41a" : "#faad14"}
                    fontSize={24}
                  />
                  <Typography.Text strong>Sales HOD Approval</Typography.Text>
                  <Typography.Text type="secondary">{workflowStatus.is_hod_approved ? "Approved" : "Pending"}</Typography.Text>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" align="center">
                  <Icon
                    icon={workflowStatus.is_cs_updated ? "mdi:check-circle" : "mdi:clock-outline"}
                    color={workflowStatus.is_cs_updated ? "#52c41a" : "#faad14"}
                    fontSize={24}
                  />
                  <Typography.Text strong>CS Update</Typography.Text>
                  <Typography.Text type="secondary">{workflowStatus.is_cs_updated ? "Updated" : "Pending"}</Typography.Text>
                </Space>
              </Col>
              <Col>
                <Space direction="vertical" align="center">
                  <Icon
                    icon={workflowStatus.is_cnf_loadlist_uploaded ? "mdi:check-circle" : "mdi:lock"}
                    color={workflowStatus.is_cnf_loadlist_uploaded ? "#52c41a" : (workflowStatus.is_hod_approved && workflowStatus.is_cs_updated ? "#faad14" : "#bfbfbf")}
                    fontSize={24}
                  />
                  <Typography.Text strong>CNF Load List</Typography.Text>
                  <Typography.Text type="secondary">
                    {workflowStatus.is_cnf_loadlist_uploaded ? "Uploaded" : (
                      workflowStatus.is_hod_approved && workflowStatus.is_cs_updated ? "Ready to Upload" : "Blocked"
                    )}
                  </Typography.Text>
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* BASIC INFO */}
        <Card
          className={Styles.card}
          bordered
          title={
            <div
              onClick={() => setShowBasicInformation((prev) => !prev)}
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
                  <Icon
                    icon="carbon:information-filled"
                    width="18"
                    height="18"
                  />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  BASIC INFORMATION
                </Typography.Title>
              </Space>

              {/* Optional arrow indicator */}
              <span style={{ fontSize: 22, color: "#626161" }}>
                {showBasicInformation ? (
                  <Icon icon="grommet-icons:form-up" />
                ) : (
                  <Icon icon="grommet-icons:form-down" />
                )}
              </span>
            </div>
          }
        >
          <div style={{ display: showBasicInformation ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Carrier Name"
                  name="carrier_name"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Carrier Name" disabled={isReadOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Customer Name"
                  name="customer_name"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Customer Name" disabled={isReadOnly} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact PIC"
                  name="contact_pic"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Person in Charge" disabled={isReadOnly} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item className={Styles.formLabel} label="Commodity">
                  <Input
                    value={commodityInput}
                    onChange={(e) => setCommodityInput(e.target.value)}
                    onPressEnter={addCommodity}
                    placeholder="Type and Press Enter to add"
                    disabled={isReadOnly}
                    rules={[{ required: true, message: "Required" }]}
                  />
                  <Space wrap style={{ marginTop: 8 }}>
                    {commodities.map((c) => (
                      <Button
                        key={c}
                        size="small"
                        onClick={() => removeCommodity(c)}
                      >
                        {c} ✕
                      </Button>
                    ))}
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="E-mail"
                  name="email"
                >
                  <Input placeholder="E-mail" disabled={isReadOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact Details"
                  name="phone_no"
                >
                  <Input placeholder="Phone Number" disabled={isReadOnly} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Agent"
                  name="agent"
                >
                  <Input placeholder="Enter Agent Name" disabled={isReadOnly} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card >

        {/* CONTAINER DETAILS */}
        < Card
          className={Styles.card}
          bordered
          title={
            < div
              onClick={() => setShowContainerDetails((prev) => !prev)}
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
                  <Icon icon="octicon:container-24" width="20" height="20" />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  CONTAINER DETAILS
                </Typography.Title>
              </Space>

              {/* Optional arrow indicator */}
              <span style={{ fontSize: 22, color: "#626161" }}>
                {showContainerDetails ? (
                  <Icon icon="grommet-icons:form-up" />
                ) : (
                  <Icon icon="grommet-icons:form-down" />
                )}
              </span>
            </div >
          }
        >
          <div style={{ display: showContainerDetails ? "block" : "none" }}>
            <Form.List name="equipmentRows" initialValue={[{}]}>
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row gutter={16} key={key} align="middle">
                      <Col xs={24} md={5}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "equipment_type"]}
                          label="Equipment Type"
                          rules={[{ required: true, message: "Required" }]}
                        >
                          <EquipmentTypeSelect disabled={isReadOnly} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "quantity"]}
                          label="Volume"
                        >
                          <Input placeholder="Qty" disabled={isReadOnly} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={5}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "category"]}
                          label="Category"
                        >
                          <CategorySelect disabled={isReadOnly} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "quote"]}
                          label="Quote"
                        >
                          <Input placeholder="Quote" disabled={isReadOnly} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "cost"]}
                          label="Cost"
                        >
                          <Input placeholder="Cost" disabled={isReadOnly} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={1}>
                        {!isReadOnly && (
                          <Button
                            danger
                            style={{ marginTop: "1rem" }}
                            disabled={fields.length <= 1}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                      <Col xs={24} md={1}>
                        {!isReadOnly && (
                          <Button
                            type="primary"
                            style={{ marginTop: "1rem" }}
                            icon={<PlusOutlined />}
                            onClick={() => add()}
                            block
                          />
                        )}
                      </Col>
                    </Row>
                  ))}
                </>
              )}
            </Form.List>
            <Row gutter={16}>
              <Col xs={24} md={24}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Other Charges"
                  name="other_charges_remarks"
                // rules={[{ required: true, message: "Required" }]}
                >
                  <TextArea placeholder="Enter any additional charges or fees" disabled={isReadOnly} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card >

        {/* SHIPMENT DETAILS */}
        < Card
          className={Styles.card}
          bordered
          title={
            < div
              onClick={() => setShowShipmentDetails((prev) => !prev)}
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
                  <Icon icon="mingcute:ship-fill" width="18" height="18" />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  SHIPMENT DETAILS
                </Typography.Title>
              </Space>

              {/* Optional arrow indicator */}
              <span style={{ fontSize: 22, color: "#626161" }}>
                {showShipmentDetails ? (
                  <Icon icon="grommet-icons:form-up" />
                ) : (
                  <Icon icon="grommet-icons:form-down" />
                )}
              </span>
            </div >
          }
        >
          <div style={{ display: showShipmentDetails ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Port Of Loading"
                  name="port_of_loading"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Loading" disabled={isReadOnly} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Port Of Discharge"
                  name="port_of_discharge"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Disacharge" disabled={isReadOnly} />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Final Port Of Discharge"
                  name="final_pod"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input
                    rules={[{ required: true, message: "Required" }]}
                    placeholder="Final Port Of Discharge"
                    disabled={isReadOnly}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Terms of Shipment"
                  name="terms_of_shipment"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select placeholder="Select Terms of Shipment" allowClear disabled={isReadOnly}>
                    <Select.Option value="prepaid">
                      Freight Prepaiad
                    </Select.Option>
                    <Select.Option value="collect">
                      Freight Collect
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Haulier Code"
                  name="haulier_code"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Code" disabled={isReadOnly} />
                </Form.Item>
              </Col>

              {/* <Col xs={24} md={18}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Remarks"
                  name="remarks"
                >
                  <TextArea placeholder="Enter Remakrs" />
                </Form.Item>
              </Col> */}
              <Col xs={24} md={3}>
                <Checkbox
                  disabled={isReadOnly}
                  checked={additionalService.hbl}
                  onChange={(e) =>
                    setAdditionalService((prev) => ({
                      ...prev,
                      hbl: e.target.checked,
                    }))
                  }
                >
                  HBL
                </Checkbox>
              </Col>
              <Col xs={24} md={3}>
                <Checkbox
                  disabled={isReadOnly}
                  checked={additionalService.fac}
                  onChange={(e) =>
                    setAdditionalService((prev) => ({
                      ...prev,
                      fac: e.target.checked,
                    }))
                  }
                >
                  FAC
                </Checkbox>
              </Col>
              <Col xs={24} md={6}>
                <Checkbox
                  disabled={isReadOnly}
                  checked={additionalService.documentation}
                  onChange={(e) =>
                    setAdditionalService((prev) => ({
                      ...prev,
                      documentation: e.target.checked,
                    }))
                  }
                >
                  DOCUMENTATION
                </Checkbox>
              </Col>
              <Col xs={24} md={6}>
                <Checkbox
                  disabled={isReadOnly}
                  checked={additionalService.showTransportation}
                  onChange={(e) =>
                    setAdditionalService((prev) => ({
                      ...prev,
                      showTransportation: e.target.checked,
                    }))
                  }
                >
                  TRANSPORTATION
                </Checkbox>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={24}>
                <Form.Item
                  className={Styles.formLabel}
                  label="SPECIAL INSTRUCTION IF ANY"
                  name="special_instructions"
                >
                  <TextArea placeholder="Enter any special instructions or requirements..." disabled={isReadOnly} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Name of Executive"
                  name="name_of_executive"
                >
                  <Input placeholder="Sales Executive" disabled={isReadOnly} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Name of Sales HOD"
                  name="sales_hod"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Sales HOD" disabled={isReadOnly} />
                </Form.Item>
              </Col>
            </Row>
          </div>
          {
            additionalService.showTransportation && (
              <Card
                className={Styles.card}
                bordered
                title={
                  <Space align="center">
                    <div className={Styles.mainhead}>
                      <Icon
                        icon="hugeicons:delivery-truck-02"
                        width="19"
                        height="19"
                      />
                    </div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      Transportation
                    </Typography.Title>
                  </Space>
                }
              >
                <Form.List name="transportationRows" initialValue={[{}]}>
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row gutter={16} key={key} align="middle">
                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "equipment_type"]}
                              label="Equipment Type"
                              rules={[{ required: true, message: "Required" }]}
                            >
                              <EquipmentTypeSelect disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={3}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "no_of_containers"]}
                              label="No. Of Containers"
                            >
                              <Input placeholder="Qty" disabled={isReadOnly} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "category"]}
                              label="Category"
                            >
                              <CategorySelect disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "placement_time"]}
                              label="Placement Date & Time"
                            >
                              <DatePicker
                                placeholder="YYYY-MM-DD"
                                style={{ width: "100%" }}
                                disabled={isReadOnly}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "pickup_location"]}
                              label="Pickup/Delivery Location"
                            >
                              <Input placeholder="Location" disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={3}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "special_remarks"]}
                              label="Special Remarks"
                            >
                              <Input placeholder="CFS Stuffing, WA" disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={1}>
                            {!isReadOnly && (
                              <Button
                                danger
                                style={{ marginTop: "1rem" }}
                                disabled={fields.length <= 1}
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            )}
                          </Col>
                          <Col xs={24} md={1}>
                            {!isReadOnly && (
                              <Button
                                type="primary"
                                style={{ marginTop: "1rem" }}
                                icon={<PlusOutlined />}
                                onClick={() => add()}
                                block
                              />
                            )}
                          </Col>
                        </Row>
                      ))}
                    </>
                  )}
                </Form.List>
              </Card>
            )
          }
        </Card >

        {!isReadOnly && (
          <Space
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginTop: "1rem",
            }}
          >
            <Button
              icon={<Icon icon="mdi:tick-circle" />}
              type="primary"
              onClick={() => form.validateFields().then(values => onFinish(values, "submitted"))}
              loading={loading}
            >
              Submit
            </Button>
            <Button
              icon={<Icon icon="mdi:content-save-edit" />}
              type="default"
              onClick={() => onFinish(form.getFieldsValue(), "draft")}
              loading={loading}
            >
              Save Draft
            </Button>
            <Button
              icon={<Icon icon="tabler:refresh" />}
              type="primary"
              onClick={handleCancel}
              disabled={loading}
            >
              Refresh
            </Button>
          </Space>
        )}
        {
          isReadOnly && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Typography.Text type="secondary" italic>
                This job is currently in the approval workflow and is read-only.
              </Typography.Text>
            </div>
          )
        }
      </Form >
    </div >
  );
};

export default SalesInput;
