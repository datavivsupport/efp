import React, { useState } from "react";
import { Form, Input, Button, Divider } from "antd";
import { Icon } from "@iconify/react";
import sharafLogo from "../../assets/sharaf-logo.png";
import { useLocation, useNavigate } from "react-router";
import ForgotPasswordModal from "../ForgotPassword/ForgotPasswordModal";
import styles from "./login.module.css";
import apiClient from "../../api/apiclient";
import ErrorComponent from "../../Components/ErrorComponent";

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [showError, setShowError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");

  const avoid = ["/login", "/mfa", "/sign-up"];

  const onFinish = async (values) => {
    const { email, password } = values;

    try {
      setLoading(true);

      const res = await apiClient.post(
        "/accounts/login",
        { email, password },
        { skipErrorHandler: true }
      );

      if (!res.data?.is_mfa_verified && res.data?.is_multi_factor_auth_enabled) {
        navigate(
          `/mfa?mode=setup${redirect && !avoid.includes(redirect)
            ? `&redirect=${redirect}`
            : ""
          }`
        );
      } else if (res.data?.is_mfa_verified) {
        navigate(
          `/mfa?mode=verify${redirect && !avoid.includes(redirect)
            ? `&redirect=${redirect}`
            : ""
          }`
        );
      } else if (redirect) {
        navigate(!avoid.includes(redirect) ? redirect : "/dashboard");
      }
    } catch (error) {
      setShowError(error?.response?.data?.msg || "Login failed");
      setTimeout(() => {
        setShowError("");
      }, 5000);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <div className={styles.loginLeft}>
            <div className={styles.loginHeader}>
              <div className={styles.loginLogo2}>
                <img
                  src={sharafLogo}
                  alt="Sharaf Shipping Agency"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              <h1 className={styles.loginTitle}>
                Sharaf Shipping Agency
              </h1>
              <p className={styles.loginSubtitle}>
                Document Management System
              </p>
            </div>

            <ErrorComponent showError={showError} />

            <Form
              name="login"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              layout="vertical"
              className={styles.emailLogin}
              form={form}
            >
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: "Please input your email!" },
                  { type: "email", message: "Please enter a valid email!" },
                ]}
              >
                <Input
                  placeholder="Enter your Business Email"
                  size="large"
                  prefix={<Icon icon="mdi:email-outline" size={20} />}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Please input your password!" },
                ]}
              >
                <Input.Password
                  placeholder="Enter your password"
                  size="large"
                  prefix={<Icon icon="mdi:lock-outline" size={20} />}
                />
              </Form.Item>

              <div className={styles.loginOptions}>
                <a
                  href="#"
                  className={styles.forgotLink}
                  onClick={(e) => {
                    e.preventDefault();
                    setForgotPasswordVisible(true);
                  }}
                >
                  Forgot password?
                </a>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                >
                  Sign in
                </Button>
              </Form.Item>

              {/* <Form.Item>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate("/signup")}
                >
                  Sign up
                </Button>
              </Form.Item> */}
            </Form>

            <Divider style={{ margin: "0 0 10px 0" }}>
              <span>or continue with</span>
            </Divider>

            <Button
              size="large"
              block
              type="primary"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_BASE_URL}/accounts/oauth/microsoft?url=${window.location.origin}/dashboard`;
              }}
            >
              <svg width={20} height={20} viewBox="0 0 48 48">
                <path fill="#F35325" d="M6 6h18v18H6z" />
                <path fill="#81BC06" d="M24 6h18v18H24z" />
                <path fill="#05A6F0" d="M6 24h18v18H6z" />
                <path fill="#FFBA00" d="M24 24h18v18H24z" />
              </svg>
              Continue with Microsoft
            </Button>
          </div>
        </div>

        <ForgotPasswordModal
          visible={forgotPasswordVisible}
          onClose={() => setForgotPasswordVisible(false)}
          change={false}
        />
      </div>
    </div>
  );
};

export default Login;
