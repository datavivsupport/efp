import React, { useState } from "react";
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
import { useNavigate } from "react-router";
import CategorySelect from "./Category";
import EquipmentTypeSelect from "./EquipmentType";

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

  const [showApprovers, setShowApprovers] = useState(true);
  const [showSpecialInstructions, setShowSpecialInstructions] = useState(true);
  const [showAdditionalService, setShowAdditionalService] = useState(true);
  const [showShipmentDetails, setShowShipmentDetails] = useState(true);
  // const [showOtherCharges, setShowOtherCharges] = useState(true);
  const [showContainerDetails, setShowContainerDetails] = useState(true);
  const [showBasicInformation, setShowBasicInformation] = useState(true);
  const [showExportDetails, setShowExportDetails] = useState(true);

  const currentYear = new Date().getFullYear().toString().slice(-2);

  const generateExportNumber = (value) => {
    const map = {
      liner: `LN/000123/${currentYear}`,
      forwarding: `FW/000123/${currentYear}`,
      "cross-trade": `CR/000123/${currentYear}`,
      others: `OT/000123/${currentYear}`,
    };

    form.setFieldsValue({
      exportNumber: value ? map[value] : "",
    });
  };

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

  const onFinish = (values) => {
    const cleanEquipment = (values.equipmentRows || []).map((row) => ({
      ...row,
      equipmentType: row?.equipmentType || "",
      quantity: row?.quantity || "",
      category: row?.category || "",
      quote: row?.quote || "",
      cost: row?.cost || "",
    }));

    const cleanTransportation = (values.transportationRows || []).map(
      (row) => ({
        ...row,
        equipmentType: row?.equipmentType || "",
        noOfContainers: row?.noOfContainers || "",
        category: row?.category || "",
        placementTime: row?.placementTime
          ? row.placementTime.format("YYYY-MM-DD HH:mm:ss")
          : "",
        pickupLocation: row?.pickupLocation || "",
        specialRemarks: row?.specialRemarks || "",
      }),
    );
    const formattedData = {
      // ...values,
      exportdetails: {
        exportNumber: values?.exportNumber,
        exportCreatedDate: values.exportCreatedDate?.format("YYYY-MM-DD"),
        exportCreatedBy: values?.exportCreatedBy,
      },
      basicinfo: {
        customerName: values?.customerName || "",
        contactPIC: values?.contactPIC || "",
        phoneno: values?.phoneno || "",
        email: values?.email || "",
        jobType: values?.jobType || "",
        agent: values?.agent || "",
        carriername: values?.carriername || "",
        commodities: commodities || [],
      },
      shipmentdetails: {
        portofloading: values?.portofloading || "",
        portofdiachage: values?.portofdiachage || "",
        finalpod: values?.finalpod || "",
        termsofshipment: values?.termsofshipment || "",
        hauliercode: values?.hauliercode || "",
        // shipmentremarks: values?.remarks || "",
        hbl: additionalService.hbl || "false",
        fac: additionalService.fac || "false",
        documentation: additionalService.documentation || "false",
        transportation: additionalService.showTransportation || "false",
        nameofexecutive: values?.nameofexecutive,
        saleshod: values?.saleshod,
        specialinstructions: values?.specialremarks || "",
      },
      containerdetails: {
        containerdetailsdata: cleanEquipment || [],
        otherchargesremarks: values?.otherchargesremarks || "",
      },
      transportationRows: additionalService.showTransportation
        ? cleanTransportation || []
        : [],
      // createdAt: new Date().toISOString(),
    };

    console.log("Final Structured Data:", formattedData);
    message.success("Form Submitted Successfully");
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
        }}
      >
        {/* <Button
          onClick={() => navigate("/dashboard")}
          type="primary"
          style={{ fontSize: "13px" }}
          icon={<Icon icon="ion:arrow-back-outline" />}
        >
          Back
        </Button> */}
        {/* EXPORT DETAILS */}
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
                  EXPORT DETAILS
                </Typography.Title>
              </Space>

              {/* Optional arrow indicator */}
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
              <Col xs={24} md={8}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Number"
                  name="exportNumber"
                >
                  <Input disabled placeholder="Enter Export Number" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Created Date"
                  name="exportCreatedDate"
                >
                  <DatePicker
                    placeholder="YYYY-MM-DD"
                    disabled
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Export Created By"
                  name="exportCreatedBy"
                >
                  <Input placeholder="Enter Export Created By" />
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
                            <Col xs={24} md={6}>
                <Form.Item
                  className={Styles.formLabel}
                  label="Job Type"
                  name="jobType"
                >
                  <Select
                    placeholder="Select Job Type"
                    onChange={generateExportNumber}
                    allowClear
                  >
                    <Select.Option value="forwarding">Forwarding</Select.Option>
                    <Select.Option value="liner">Liner</Select.Option>
                    <Select.Option value="cross-trade">
                      Cross Trade
                    </Select.Option>
                    <Select.Option value="others">Others</Select.Option>
                  </Select>
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
        </Card>

        {/* CONTAINER DETAILS */}
        <Card
          className={Styles.card}
          bordered
          title={
            <div
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
            </div>
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
        </Card>

        {/* SHIPMENT DETAILS */}
        <Card
          className={Styles.card}
          bordered
          title={
            <div
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
            </div>
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
          {additionalService.showTransportation && (
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
          )}
        </Card>

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
            htmlType="submit"
          >
            Submit
          </Button>
          <Button icon={<Icon icon="ion:save-sharp" />} type="primary">
            Save
          </Button>
          <Button
            icon={<Icon icon="tabler:refresh" />}
            type="primary"
            onClick={handleCancel}
          >
            Refresh
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default SalesInput;
