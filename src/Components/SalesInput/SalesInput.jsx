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
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const user = useSelector((state) => state.auth.user);

  const isReadOnly = currentStage && parseInt(currentStage) > 1; // Locked if beyond Stage 1

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

          // Map backend data to form fields
          form.setFieldsValue({
            customerName: data.customer_name,
            contactPIC: data.contact_pic,
            phoneno: data.phone_no,
            email: data.email,
            jobType: data.job_type,
            agent: data.agent,
            carriername: data.carrier_name,
            portofloading: data.port_of_loading,
            portofdiachage: data.port_of_discharge,
            finalpod: data.final_pod,
            termsofshipment: data.terms_of_shipment,
            hauliercode: data.haulier_code,
            nameofexecutive: data.name_of_executive,
            saleshod: data.sales_hod,
            specialremarks: data.special_instructions,
            otherchargesremarks: data.approval_details?.other_charges_remarks,
            exportCreatedDate: data.export_created_date ? dayjs(data.export_created_date) : dayjs(),
            exportNumber: data.export_number || "N/A",
            exportCreatedBy: data.created_by_name || "",
            lpoRequired: data.approval_details?.lpo_required ?? true,
            releaseOrderRequired: data.approval_details?.release_order_required ?? true,
          });

          // Set state for dynamic lists
          setCommodities((data.commodities || []).map(c => c.name));

          const mappedEquipment = (data.container_details || []).map((cd, index) => ({
            id: cd.id || index + 1,
            equipmentType: cd.equipment_type,
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
            equipmentType: tr.equipment_type,
            noOfContainers: tr.no_of_containers,
            category: tr.category,
            placementTime: tr.placement_time ? dayjs(tr.placement_time) : null,
            pickupLocation: tr.pickup_location,
            specialRemarks: tr.special_remarks
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
      equipment_type: row?.equipmentType || "",
      quantity: Number(row?.quantity) || 0,
      category: row?.category || "",
      quote: row?.quote || "",
      cost: row?.cost || "",
    }));

    const cleanTransportation = (values.transportationRows || []).map(
      (row) => ({
        equipment_type: row?.equipmentType || "",
        no_of_containers: Number(row?.noOfContainers) || 0,
        category: row?.category || "",
        placement_time: row?.placementTime
          ? row.placementTime.format("YYYY-MM-DD HH:mm:ss")
          : null,
        pickup_location: row?.pickupLocation || "",
        special_remarks: row?.specialRemarks || "",
      }),
    );

    // Auto-include any typed but not-yet-Enter-pressed commodity text
    const allCommodities = [...(commodities || [])];
    if (commodityInput && commodityInput.trim() && !allCommodities.includes(commodityInput.trim())) {
      allCommodities.push(commodityInput.trim());
    }

    const payload = {
      customer_name: values?.customerName || "",
      contact_pic: values?.contactPIC || "",
      phone_no: values?.phoneno || "",
      email: values?.email || "",
      job_type: values?.jobType || "liner",
      agent: values?.agent || "",
      carrier_name: values?.carriername || "",
      port_of_loading: values?.portofloading || "",
      port_of_discharge: values?.portofdiachage || "",
      final_pod: values?.finalpod || "",
      terms_of_shipment: values?.termsofshipment || "",
      haulier_code: values?.hauliercode || "",
      hbl: additionalService.hbl || false,
      fac: additionalService.fac || false,
      documentation: additionalService.documentation || false,
      transportation: additionalService.showTransportation || false,
      name_of_executive: values?.nameofexecutive || "",
      sales_hod: values?.saleshod || "",
      special_instructions: values?.specialremarks || "",
      approval_details: {
        other_charges_remarks: values?.otherchargesremarks || "",
        lpo_required: values?.lpoRequired ?? true,
        release_order_required: values?.releaseOrderRequired ?? true,
      },
      status: statusValue,
      commodities: allCommodities.map((c) => ({ name: c })),
      container_details: cleanEquipment || [],
      transportation_rows: additionalService.showTransportation
        ? cleanTransportation || []
        : [],
      export_created_date: values.exportCreatedDate ? values.exportCreatedDate.format("YYYY-MM-DD") : null,
      export_number: values.exportNumber !== "N/A" ? values.exportNumber : null,
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
        equipmentType: "",
        volume: "",
        category: "",
        quote: "",
        cost: "",
      },
    ]);
    setTransportationRows([
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
    setShowTransportation(false);
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
          exportCreatedDate: dayjs(),
          exportCreatedBy: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "",
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
                  name="jobType"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select
                    placeholder="Select Job Type"
                    allowClear
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
                  name="exportNumber"
                >
                  <Input disabled placeholder="N/A" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Created Date"
                  name="exportCreatedDate"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    disabled
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Created By"
                  name="exportCreatedBy"
                >
                  <Input disabled placeholder="User Name" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>

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
                  name="carriername"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Carrier Name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Customer Name"
                  name="customerName"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Customer Name" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact PIC"
                  name="contactPIC"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Person in Charge" />
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
                  <Input placeholder="E-mail" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Contact Details"
                  name="phoneno"
                >
                  <Input placeholder="Phone Number" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Agent"
                  name="agent"
                >
                  <Input placeholder="Enter Agent Name" />
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
                          {...restField}
                          name={[name, "quantity"]}
                          label="Volume"
                        >
                          <Input placeholder="Qty" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={5}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "category"]}
                          label="Category"
                        >
                          <CategorySelect />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
                          name={[name, "quote"]}
                          label="Quote"
                        >
                          <Input placeholder="Quote" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={4}>
                        <Form.Item
                          className={Styles.formLabel}
                          {...restField}
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
                          block
                        />
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
                  name="otherchargesremarks"
                // rules={[{ required: true, message: "Required" }]}
                >
                  <TextArea placeholder="Enter any additional charges or fees" />
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
                  name="portofloading"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Loading" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Port Of Discharge"
                  name="portofdiachage"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Port of Disacharge" />
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Final Port Of Discharge"
                  name="finalpod"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input
                    rules={[{ required: true, message: "Required" }]}
                    placeholder="Final Port Of Discharge"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Terms of Shipment"
                  name="termsofshipment"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Select placeholder="Select Terms of Shipment" allowClear>
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
                  name="hauliercode"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Enter Code" />
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
                  name="specialremarks"
                >
                  <TextArea placeholder="Enter any special instructions or requirements..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Name of Executive"
                  name="nameofexecutive"
                >
                  <Input placeholder="Sales Executive" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Name of Sales HOD"
                  name="saleshod"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <Input placeholder="Sales HOD" />
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
                              {...restField}
                              name={[name, "noOfContainers"]}
                              label="No. Of Containers"
                            >
                              <Input placeholder="Qty" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "category"]}
                              label="Category"
                            >
                              <CategorySelect />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "placementTime"]}
                              label="Placement Date & Time"
                            >
                              <DatePicker
                                placeholder="YYYY-MM-DD"
                                style={{ width: "100%" }}
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "pickupLocation"]}
                              label="Pickup/Delivery Location"
                            >
                              <Input placeholder="Location" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={3}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "specialRemarks"]}
                              label="Special Remarks"
                            >
                              <Input placeholder="CFS Stuffing, WA" />
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
                              block
                            />
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
