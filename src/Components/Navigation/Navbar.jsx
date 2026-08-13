import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Drawer,
  Modal,
  Popover,
  Space,
  Tooltip,
  message,
} from "antd";
import { useNavigate, useLocation } from "react-router";
import { Chart, registerables } from "chart.js";
import { ChevronDown, User, Menu } from "lucide-react";
import sharafLogo from "../../assets/SSA_Logo_1_SVG.svg";
import styles from "./Navbar.module.css";
import { Icon } from "@iconify/react";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import { computeUserRoles } from "../Approval/utils/roleUtils";

const Navigation = () => {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const popoverRef = useRef(null);
  Chart.register(...registerables);

  const { isAccountsTeam, isAdmin } = computeUserRoles(user);

  const tabs = [
    { key: "/dashboard", label: "Overview" },
    { key: "/sales-input", label: "Sales Input" },
    // { key: "/approval", label: "Approval" },
    ...(isAccountsTeam || isAdmin ? [{ key: "/accounts-dashboard", label: "Accounts" }] : []),
    { key: "/export-report", label: "Report" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setPopoverOpen(false);
      }
    };

    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

  const handleOpenPopover = () => setPopoverOpen(true);

  const handleLogout = () => {
    setPopoverOpen(false);
    setDrawerVisible(false);
    localStorage.removeItem("token");
    message.success("Logout successfully.");
    navigate("/login");
  };

  const goToProfile = () => {
    setPopoverOpen(false);
    setDrawerVisible(false);
    navigate("/profile");
  };

  const popoverContent = (
    <div style={{ fontSize: 13, color: "#888" }}>{user?.email || ""}</div>
  );

  const logoutmodal = () => {
    Modal.confirm({
      title: "Log Out",
      content: `Are you sure you want to log out?`,
      okText: "Yes",
      cancelText: "Cancel",
      onOk: () => {
        handleLogout();
      },
    });
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="px-2 py-2 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <div className={styles.title}>
            <img
              src={sharafLogo}
              alt="Sharaf Shipping Agency"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Desktop Tabs */}
          <div className={`${styles.navTabs} hidden md:flex`}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.navTab} ${
                  location.pathname === tab.key ? styles.active : ""
                }`}
                onClick={() => navigate(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center">


          {/* User + Logout */}
          <div
            className="hidden md:flex items-center space-x-3"
            ref={popoverRef}
          >
            {/* Profile Button */}
            <Tooltip title="My Profile">
              <button onClick={goToProfile} className={styles.buttonnew}>
                <Icon height="20" width="20" icon="mdi:account-circle" />
              </button>
            </Tooltip>
            {/* Logout Button */}
            <Tooltip title="Log Out">
              <button
                onClick={() => logoutmodal()}
                className={styles.buttonnew}
              >
                <Icon height="20" width="20" icon="mdi:logout" />
              </button>
            </Tooltip>
            {/* Profile Info */}
            <Popover
              content={popoverContent}
              trigger="hover"
              placement="bottomRight"
            >
              <div className="flex items-center space-x-2 bg-gray-100 px-2 py-2 rounded-full hover:bg-gray-200 transition">
                <span className="flex items-center space-x-2 bg-gray-400 px-1 py-1 rounded-full">
                  <User
                    style={{ color: "#fff" }}
                    className="w-5 h-5 text-gray-600"
                  />
                </span>
              </div>
            </Popover>
          </div>

          {/* Mobile Menu */}
          <button
            className="p-2 hover:bg-gray-100 rounded-md md:hidden"
            onClick={() => setDrawerVisible(true)}
          >
            <Menu style={{ color: "#04a099" }} className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <button
            className={styles.navTab}
            onClick={goToProfile}
            style={{
              display: "flex",
              width: "100%",
              textAlign: "left",
              backgroundColor: "#ffffff97",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span className="flex items-center space-x-2 bg-gray-100 px-2 py-2 rounded-full">
              <User
                style={{ color: "#00aea6" }}
                className="w-5 h-5 text-gray-600"
              />
            </span>{" "}
            <span style={{ fontSize: "14px" }}>
              {user?.first_name || ""} {user?.last_name || ""}
            </span>
          </button>

          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.navTab} ${
                location.pathname === tab.key ? styles.active : ""
              }`}
              onClick={() => {
                navigate(tab.key);
                setDrawerVisible(false);
              }}
              style={{ width: "100%", textAlign: "left" }}
            >
              {tab.label}
            </button>
          ))}

          <button
            className={styles.navTab}
            style={{ width: "100%", textAlign: "left" }}
            onClick={goToProfile}
          >
            Profile
          </button>

          <button
            className={styles.navTab}
            style={{ width: "100%", textAlign: "left" }}
            onClick={() => logoutmodal()}
          >
            Logout
          </button>
        </Space>
      </Drawer>
    </nav>
  );
};

export default Navigation;
