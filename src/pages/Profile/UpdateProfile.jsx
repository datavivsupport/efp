import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiclient";
import { uploadFile } from "../../Components/Viewer/UploadUtil";
import { setUser } from "../../store/authSlice";
import {
  getRoleNamesWithComma,
  normalizeDepartments,
  normalizeDivision,
} from "../../utils/roleFormat";

const { Text, Title } = Typography;

/*
  The upload endpoint tops out at 30MB, but a profile photo has no business
  being that big — hold it to 5MB so a mistaken pick fails fast in the browser
  instead of after a long round-trip.
*/
const MAX_AVATAR_MB = 5;

/* Digits, optionally led by "+", with spaces / hyphens / brackets as separators */
const PHONE_SHAPE = /^\+?[\d\s\-()]+$/;

/*
  The column is nullable and blank-allowed, so an empty phone is valid — a user
  with no number on record must still be able to change their Status. A value
  that is present has to look like a real number: 7-15 digits, the E.164 range.
*/
const validatePhone = (_, value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return Promise.resolve();

  if (!PHONE_SHAPE.test(trimmed)) {
    return Promise.reject(
      new Error("Use digits only, with an optional leading + and - ( ) separators"),
    );
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return Promise.reject(new Error("Phone number must be 7 to 15 digits"));
  }

  return Promise.resolve();
};

const UpdateProfile = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const storedUser = useSelector((state) => state.auth.user);

  const [profile, setProfileData] = useState(null);
  const [divisionName, setDivisionName] = useState("");
  const [departmentNames, setDepartmentNames] = useState([]);
  const [profilePic, setProfilePic] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMfaVerified, setIsMfaVerified] = useState(false);

  
  const [mfaModal, setMfaModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const hydratedRef = useRef(false);

  // Held in a ref as well as state: the revoke has to reach the URL being
  // replaced, and a ref is the only copy that is current inside the cleanup.
  const previewUrlRef = useRef("");

  const showPreview = (url) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const clearPreview = () => {
    showPreview("");
    setSelectedFile(null);
  };

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );



  const applyProfile = (data) => {
    if (!data) return;

    form.setFieldsValue({
      ...data,
      roles: getRoleNamesWithComma(data.roles),
   
      is_leave: data.is_leave ?? false,
    });

    setProfileData(data);
    setIsMfaVerified(Boolean(data.is_mfa_verified));

    if (data.profile_picture) setProfilePic(data.profile_picture);

    resolveDepartments(data.departments_assigned);
    resolveDivision(data.divison ?? data.division);
  };

  const getProfile = async (syncStore = false) => {
    try {
      const res = await apiClient.get("/accounts/me");
      const data = res.data?.data;
      if (!data) return;

      applyProfile(data);

      if (syncStore) dispatch(setUser(data));
    } catch {
      // Error toast already raised by the apiClient interceptor
    }
  };

 
  const resolveDepartments = async (raw) => {
    const { ids, names } = normalizeDepartments(raw);

    if (names.length) {
      setDepartmentNames(names);
      return;
    }
    if (!ids.length) {
      setDepartmentNames([]);
      return;
    }

    try {
      const responses = await Promise.all(
        ids.map((id) => apiClient.get(`/accounts/master/Department/${id}/`)),
      );
      setDepartmentNames(responses.map((r) => r.data?.name).filter(Boolean));
    } catch {
      setDepartmentNames([]);
    }
  };

  const resolveDivision = async (raw) => {
    const { id, name } = normalizeDivision(raw);

    if (name) {
      setDivisionName(name);
      return;
    }
    if (!id) {
      setDivisionName("");
      return;
    }

    try {
      const res = await apiClient.get(`/accounts/master/division/${id}/`);
      setDivisionName(res.data?.name || "");
    } catch {
      setDivisionName("");
    }
  };

 
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (storedUser) applyProfile(storedUser);
    else getProfile(); 
  }, [storedUser]);


  // Returning false keeps the file in hand instead of firing antd's own
  // uploader — the photo goes to S3 on Save, together with the rest of the form.
  const beforeUpload = (file) => {
    if (!file.type?.startsWith("image/")) {
      message.error("You can only upload image files!");
      return Upload.LIST_IGNORE;
    }

    if (file.size / 1024 / 1024 >= MAX_AVATAR_MB) {
      message.error(`Image must be smaller than ${MAX_AVATAR_MB}MB!`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handlePick = ({ fileList }) => {
    const file = fileList[fileList.length - 1];
    if (!file?.originFileObj) return;

    setSelectedFile(file);
    showPreview(URL.createObjectURL(file.originFileObj));
  };

  // Phone, Status and the photo are the only user-editable fields. PATCH, not
  // POST: the POST handler assigns every field unconditionally from
  // request.data, so omitting the read-only ones would null out the name.
  // PATCH only touches keys that are actually present.
  const onFinish = async (values) => {
    try {
      setLoading(true);

      const payload = {
        phone: values.phone?.trim() || null,
        is_leave: values.is_leave,
      };

      // Only send profile_picture when a new photo was picked — a PATCH without
      // the key leaves the stored one alone.
      if (selectedFile) {
        let uploadedUrl = "";
        try {
          uploadedUrl = await uploadFile([selectedFile]);
        } catch {
          // Toast raised below — the interceptor's own one only covers HTTP
          // failures, not the local "no file" cases uploadFile throws on.
        }

        // A 200 that came back without an s3_url counts as a failure too:
        // letting it through would report success with the old photo intact.
        if (!uploadedUrl) {
          message.error(
            "Profile picture upload failed. Your changes were not saved.",
          );
          return;
        }

        payload.profile_picture = uploadedUrl;
      }

      const res = await apiClient.patch("/accounts/me", payload);

      // PATCH echoes the saved profile back, so the page and the store both
      // refresh without a second round-trip.
      const data = res.data?.data;
      if (data) {
        applyProfile(data);
        dispatch(setUser(data));
      } else {
        await getProfile(true);
      }

      // Dropped only once the saved URL is in place, so the avatar swaps from
      // the local preview to the stored photo without blanking in between.
      clearPreview();

      message.success("Profile updated successfully!");
    } catch {
      // handled by the interceptor
    } finally {
      setLoading(false);
    }
  };


  const openMfaModal = async () => {
    setOtp("");
    setQrCode("");
    setMfaModal(true);
    try {
      const res = await apiClient.get("/accounts/get_mfa");
      setQrCode("data:image/png;base64," + res.data.image);
    } catch {
      // Error toast already raised by the apiClient interceptor
    }
  };

  const verifyMfa = async (value = otp) => {
    if (!value || value.length !== 6) {
      message.error("Enter a valid 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      await apiClient.post("/accounts/verify_mfa", { token: value });
      message.success("MFA setup successful!");
      setMfaModal(false);
      // syncStore, or the store keeps is_mfa_verified: false and a later
      // remount hydrates the page back to "MFA not set up".
      await getProfile(true);
    } catch {
      // handled by the interceptor
    } finally {
      setVerifying(false);
    }
  };

  const disabledFieldStyle = { backgroundColor: "#f8fafc" };

  // An unsaved pick wins over the stored photo, so the avatar shows what Save
  // is about to upload.
  const avatarSrc = previewUrl || profilePic;

  return (
    <div style={{ padding: "20px", backgroundColor: "#eff8ff", minHeight: "100vh" }}>
      <div style={{ minWidth: "385px", maxWidth: "1024px", margin: "0 auto" }}>
        <Card
          variant="outlined"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#eff8ff",
          }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(to right, #003a75, #19d0c6)",
              padding: "12px 20px",
            }}
          >
            <Button
              type="primary"
              icon={<Icon icon="mdi:arrow-left" width="16" height="16" />}
              onClick={() => navigate(-1)}
              style={{
                fontSize: "16px",
                marginBottom: "0.5rem",
                height: "35px",
                border: "2px solid #19D0C6",
              }}
            >
              Back
            </Button>
            <Title level={2} style={{ color: "white", margin: 0 }}>
              Update Profile
            </Title>
            <Text style={{ color: "#bfdbfe", fontSize: 14 }}>
              Manage your account information
            </Text>
          </div>

          <div style={{ padding: 24 }}>
            {/* Avatar + summary */}
            <div
              style={{
                display: "flex",
                gap: "32px",
                marginBottom: "32px",
                paddingBottom: "32px",
                borderBottom: "1px solid #e2e8f0",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative" }}>
                <Avatar
                  size={128}
                  src={avatarSrc || undefined}
                  icon={
                    !avatarSrc ? (
                      <Icon icon="mdi:account" width="64" height="64" />
                    ) : undefined
                  }
                  style={{
                    border: "4px solid white",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Upload
                  maxCount={1}
                  showUploadList={false}
                  disabled={loading}
                  beforeUpload={beforeUpload}
                  onChange={handlePick}
                  accept="image/jpeg,image/png"
                >
                  <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    disabled={loading}
                    title="Change profile photo"
                    icon={<Icon icon="mdi:camera" width="18" height="18" />}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </Upload>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <Title
                  level={4}
                  style={{ margin: 0, marginBottom: "4px", marginTop: "1.3rem" }}
                >
                  {profile
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                    : "Loading..."}
                </Title>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: "12px" }}
                >
                  {profile ? getRoleNamesWithComma(profile.roles) : "Loading..."}
                </Text>
                <Space>
                  <Icon icon="mdi:email" style={{ color: "#64748b" }} />
                  <Text type="secondary">
                    {profile ? profile.email : "Loading..."}
                  </Text>
                </Space>
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: isMfaVerified ? "#10b981" : "#ef4444",
                    }}
                  >
                    {isMfaVerified ? "MFA Enabled ✓" : "MFA Disabled"}
                  </Text>
                  {!isMfaVerified && (
                    <Button size="small" onClick={openMfaModal}>
                      Enable MFA
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={5} style={{ marginBottom: 16 }}>
                    <Icon
                      icon="mdi:account"
                      style={{ marginRight: 8, verticalAlign: "-3px" }}
                    />
                    Personal Information
                  </Title>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="first_name" label="First Name">
                        <Input size="large" disabled style={disabledFieldStyle} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="last_name" label="Last Name">
                        <Input size="large" disabled style={disabledFieldStyle} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="email" label="Email">
                        <Input
                          size="large"
                          prefix={<Icon icon="mdi:email" />}
                          disabled
                          style={disabledFieldStyle}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="roles" label="Roles">
                        <Input size="large" disabled style={disabledFieldStyle} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        name="is_leave"
                        label="Status"
                        rules={[{ required: true, message: "Select status" }]}
                      >
                        <Select
                          size="large"
                          placeholder="Select your status"
                          options={[
                            { value: false, label: "Available" },
                            { value: true, label: "On Leave" },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        name="phone"
                        label="Phone No."
                        validateTrigger={["onBlur", "onSubmit"]}
                        rules={[{ validator: validatePhone }]}
                      >
                        <Input
                          size="large"
                          prefix={<Icon icon="mdi:phone" />}
                          placeholder="e.g. +971 50 123 4567"
                          maxLength={20}
                          allowClear
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Division">
                        <Input
                          size="large"
                          value={divisionName}
                          disabled
                          style={disabledFieldStyle}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Department">
                        <Space wrap>
                          {departmentNames.map((name) => (
                            <Button
                              key={name}
                              size="small"
                              disabled
                              style={{ color: "black" }}
                            >
                              {name}
                            </Button>
                          ))}
                        </Space>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <Row justify="end" style={{ paddingTop: 16, alignItems: "center", gap: "10px" }}>
                  <Col>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={loading}
                      style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
                    >
                      Save Changes
                    </Button>
                  </Col>
                </Row>
              </Space>
            </Form>
          </div>
        </Card>
      </div>

      {/* MFA setup */}
      <Modal
        open={mfaModal}
        onCancel={() => setMfaModal(false)}
        footer={null}
        centered
        width={400}
      >
        <h3 style={{ textAlign: "center", marginBottom: 10, fontWeight: "bold" }}>
          Microsoft Authenticator Setup
        </h3>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {qrCode ? (
            <img src={qrCode} alt="MFA QR" style={{ width: 180, height: 180 }} />
          ) : (
            <p>Loading QR...</p>
          )}
        </div>

        <Input.OTP
          length={6}
          value={otp}
          autoFocus
          size="large"
          style={{ display: "flex", justifyContent: "center", gap: "8px" }}
          onInput={(value) => {
            const joined = value.join("");
            setOtp(joined);
            if (joined.length === 6 && !verifying) verifyMfa(joined);
          }}
        />

        <Button
          type="primary"
          block
          size="large"
          loading={verifying}
          style={{ marginTop: 20, height: 45 }}
          onClick={() => verifyMfa()}
        >
          Verify &amp; Enable MFA
        </Button>
      </Modal>
    </div>
  );
};

export default UpdateProfile;
