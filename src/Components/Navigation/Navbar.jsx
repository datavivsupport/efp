import React, { useState, useRef, useEffect } from "react";
import { Badge, Button, Drawer, Modal, Space, Tooltip, message } from "antd";
import { useNavigate, useLocation } from "react-router";
import { Chart, registerables } from "chart.js";
import { ChevronDown, User, Menu } from "lucide-react";
import sharafLogo from "../../assets/sharaf-logo.png";
import styles from "./Navbar.module.css";
import { Icon } from "@iconify/react";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const popoverRef = useRef(null);
  Chart.register(...registerables);

  const tabs = [
    { key: "/dashboard", label: "Dashboard" },
    { key: "/sales-input", label: "Sales Input" },
    { key: "/approval", label: "Approval" },
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
        <div className="flex items-center space-x-4">
          {/* Notification */}
          <Button
            type="text"
            className="p-2 rounded-md hidden md:block hover:bg-gray-100"
          >
            <Badge
              count={7}
              size="medium"
              style={{
                background: "linear-gradient(to right, #003a75, #19d0c6)",
                color: "#fff",
                fontSize: "10px",
              }}
            >
              <Icon
                icon="clarity:notification-line"
                style={{ color: "#04a099" }}
                width="22"
                height="22"
              />
            </Badge>
          </Button>

          {/* User popover */}
          <div className="relative hidden md:block" ref={popoverRef}>
            <button
              className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-md"
              onClick={handleOpenPopover}
            >
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">Sales</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            )}
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
            onClick={handleLogout}
            style={{ width: "100%", textAlign: "left" }}
          >
            Logout
          </button>
        </Space>
      </Drawer>
    </nav>
  );
};

export default Navigation;
