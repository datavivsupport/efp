import React, { useEffect, useState, useRef } from "react";
import { Modal, Form, Input, Button, Typography, message } from "antd";
import { Icon } from "@iconify/react";
import styles from "./ForgotPasswordModal.module.css";
import apiClient from "../../api/apiclient";

const { Title, Text, Paragraph } = Typography;

const ForgotPasswordModal = ({ visible, onClose, change }) => {
  const [formEmail] = Form.useForm();
  const [formReset] = Form.useForm();
  const [formOtp] = Form.useForm();

  const otpRef = useRef(null);

  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);

  const [otpValue, setOtpValue] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Focus OTP input
  useEffect(() => {
    if (otpModalVisible) {
      setTimeout(() => {
        otpRef.current?.focus();
      }, 100);
    }
  }, [otpModalVisible]);

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);

      return () => clearTimeout(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (otpValue.length === 4 && !verifying) {
      handleVerifyOtp(otpValue);
    }
  }, [otpValue]);

  // Reset everything when modal closes
  useEffect(() => {
    if (!visible) {
      formEmail.resetFields();
      formReset.resetFields();
      setOtpModalVisible(false);
      setResetPasswordVisible(false);
      setOtpValue("");
      setVerifiedEmail("");
    }
  }, [visible]);

  // Send OTP (Fake)
  const handleSendOtp = async () => {
    const email = formEmail.getFieldValue("email");
    if (!email) return;
    try {
      setTimer(60);
      setLoading(true);
      await apiClient.get(`/accounts/sendOtp?email=${email}`);
      message.success(`OTP sent to ${email}`);
      setOtpModalVisible(true);
      setOtpValue("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        errorHandle(data);
      } else {
        // console.error("Unknown error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 4) return;
    setVerifying(true);

    try {
      setLoading(true);
      const email = formEmail.getFieldValue("email");
      const res = await apiClient.get(
        `/accounts/verify-otp?email=${email}&otp=${otpValue}`
      );

      message.success(res.data.msg);
      setVerifiedEmail(email);
      setOtpModalVisible(false);
      setResetPasswordVisible(true);
      formOtp.resetFields();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        errorHandle(data);
      }
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (values) => {
    const { password, confirmPassword } = values;
        if (password !== confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("/accounts/reset-password", {
        email: verifiedEmail,
        password: password,
        otp: otpValue,
      });

      message.success(response.data.msg);
      setResetPasswordVisible(false);
      formEmail.resetFields();
      formReset.resetFields();
      setVerifiedEmail("");
      setOtpValue("");
      onClose(); // close parent modal after success
    } catch {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAll = () => {
    formEmail.resetFields();
    formReset.resetFields();
    setOtpModalVisible(false);
    setResetPasswordVisible(false);
    setOtpValue("");
    setVerifiedEmail("");
    onClose();
  };

  return (
    <>
      {/* Main Forgot Password Modal */}
      <Modal
        open={visible}
        onCancel={handleCancelAll}
        footer={null}
        centered
        width={500}
      >
        <div className={styles.container}>
          <div className={styles.iconWrapper}>
            <Icon icon="mdi:lock-reset" width={32} color="#ffffff" />
          </div>

          <Title level={3}>
            {change ? "Change Password" : "Forgot Password?"}
          </Title>

          <Paragraph className={styles.subtitle}>
            Enter your email address and we'll send you an OTP.
          </Paragraph>

          <Form form={formEmail} layout="vertical">
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Enter valid email!" },
              ]}
            >
              <Input
                placeholder="Enter your registered Email"
                prefix={<Icon icon="mdi:email-outline" width={20} />}
              />
            </Form.Item>

            <Button
              type="primary"
              size="large"
              block
              onClick={() => handleSendOtp()}
              loading={loading}
            >
              Send OTP
            </Button>
          </Form>

          <div className={styles.footer}>
            <Text type="secondary">
              <Icon icon="mdi:shield-check" width={14} /> Secure password reset • 256-bit encryption
            </Text>
          </div>
        </div>
      </Modal>

      {/* OTP Modal */}
      <Modal
        open={otpModalVisible}
        title="Verify OTP"
        onCancel={() => setOtpModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={formOtp}>
          <Text>Please enter the 4-digit OTP</Text>

          <Input.OTP
            length={4}
            ref={otpRef}
            value={otpValue}
            onChange={(value) => setOtpValue(value)}
            style={{ width: "100%", margin: "16px 0" }}
          />

          <Button type="primary" block onClick={() => handleVerifyOtp()}>
            Verify OTP
          </Button>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            {timer === 0 ? (
              <Button type="link" onClick={() => handleSendOtp()}>
                Resend OTP
              </Button>
            ) : (
              <Text type="secondary">
                Resend OTP in {timer}s
              </Text>
            )}
          </div>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordVisible}
        title="Reset Password"
        onCancel={() => setResetPasswordVisible(false)}
        footer={null}
        centered
      >
        <Form layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            name="password"
            label="New Password"
            size="large"
            rules={[{ required: true, message: "Enter password" }]}
          >
            <Input.Password placeholder="Enter New Password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            size="large"
            rules={[{ required: true, message: "Confirm password" }]}
          >
            <Input.Password placeholder="Confirm New Password" />
          </Form.Item>

          <Button size="large" type="primary" block htmlType="submit" loading={loading}>
            Reset Password
          </Button>
        </Form>
      </Modal>
    </>
  );
};

export default ForgotPasswordModal;