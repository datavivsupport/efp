import React, { useState, useRef, useEffect } from "react";
import {
  Badge,
  Button,
  Drawer,
  Dropdown,
  Modal,
  Popover,
  Space,
  Spin,
  Tooltip,
  message,
} from "antd";
import { useNavigate, useLocation } from "react-router";
import { Chart, registerables } from "chart.js";
<<<<<<< HEAD
import { ChevronDown, User, Menu } from "lucide-react";
import sharafLogo from "../../assets/SSA_Logo_1_SVG.svg";
import styles from "./Navbar.module.css";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import apiClient, {
  cancelAllRequests,
  finishLogout,
  startLogout,
} from "../../api/apiclient";
import { logout } from "../../store/authSlice";
=======
import { ChevronDown, User, Menu, Type } from "lucide-react";
import sharafLogo from "../../assets/sharaf-logo.png";
import styles from "./Navbar.module.css";
import { Icon } from "@iconify/react";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import dayjs from "../../dayjs-config";
import { FONT_SIZES, useFontSize } from "../FontSizeProvider";
import ForgotPasswordModal from "../../pages/ForgotPassword/ForgotPasswordModal";
>>>>>>> added-notificcaiton-and-password
import { computeUserRoles } from "../Approval/utils/roleUtils";

const NOTIF_STYLES = {
  info: { label: "INFO", color: "#00aea6" },
  alert: { label: "ALERT", color: "#faad14" },
  message: { label: "MESSAGE", color: "#00aea6" },
  system: { label: "SYSTEM", color: "#8c8c8c" },
  PENDING: { label: "PENDING", color: "#faad14" },
  CLARIFICATION: { label: "CLARIFICATION", color: "#faad14" },
  APPROVED: { label: "APPROVED", color: "#52c41a" },
  RESUBMITTED: { label: "RESUBMITTED", color: "#ff4d4f" },
  REJECTED: { label: "REJECTED", color: "#ff4d4f" },
};

const resolveNotifStyle = (notifType) =>
  NOTIF_STYLES[notifType] || {
    label: notifType?.toUpperCase() || "OTHER",
    color: "#d9d9d9",
  };

const Navigation = ({
  notifications = [],
  markAllAsRead,
  markSingleAsRead,
  totalUnread = 0,
  hasMore = false,
  loadMore,
  loadingMore = false,
}) => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { fontSize, setFontSize } = useFontSize();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [hoveredNotifId, setHoveredNotifId] = useState(null);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

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

 
  const handleLogout = async () => {
    setPopoverOpen(false);
    setDrawerVisible(false);

    try {
      startLogout();
      cancelAllRequests();
      await apiClient.get("/accounts/logout");
    } catch {
      // log out locally regardless
    } finally {
      localStorage.removeItem("open_tabs");
      finishLogout();
      dispatch(logout());
      message.success("Logout successfully.");
      navigate("/login", { replace: true });
    }
  };

  const goToTab = (key) => {
    if (location.pathname !== key) navigate(key);
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

 
  const fontSizeItems = Object.entries(FONT_SIZES).map(([key, { label }]) => ({
    key,
    label,
  }));

  const displayCount = totalUnread > 9 ? "9+" : totalUnread || undefined;

  // Near-bottom scroll pulls the next page (avoids an extra scroll library)
  const handleNotifScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      loadMore?.();
    }
  };

  const openJob = (jobId) => {
    setNotificationVisible(false);
    navigate(`/approval?id=${jobId}`);
  };

  const notificationContent = (
    <div className={styles.notfiPopover}>
      {notifications.length === 0 ? (
        <div className={styles.notfiEmpty}>No notifications</div>
      ) : (
        <>
          <div className={styles.notfiToolbar}>
            <span className={styles.notfiToolbarCount}>
              {totalUnread} unread
            </span>
            <button className={styles.notfiClearAllBtn} onClick={markAllAsRead}>
              Clear all
            </button>
          </div>

          <div className={styles.notfiList} onScroll={handleNotifScroll}>
            {notifications.map((item) => {
              const isUnread = !item.read;
              const { label: badgeLabel, color: badgeColor } =
                resolveNotifStyle(item.notif_type);
              const jobId = item.data?.sales_input_id;

              return (
                <div
                  key={item.id}
                  className={`${styles.notfiItem} ${
                    hoveredNotifId === item.id ? styles.notfiItemHover : ""
                  }`}
                  style={{ borderColor: isUnread ? badgeColor : "#f0f0f0" }}
                  onMouseEnter={() => setHoveredNotifId(item.id)}
                  onMouseLeave={() => setHoveredNotifId(null)}
                >
                  <div className={styles.notfiHeader}>
                    <span className={styles.notfiIcon}>
                      <Icon color="#00aea6" icon="flat-color-icons:document" />
                    </span>

                    <span
                      className={styles.notfiBadge}
                      style={{ backgroundColor: badgeColor }}
                    >
                      {badgeLabel}
                    </span>

                    {isUnread && <span className={styles.notfiUnreadDot} />}

                    <button
                      className={styles.notfiClearBtn}
                      title="Dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        markSingleAsRead?.(item.id);
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className={styles.notfiTitle}>{item.title}</div>
                  <div className={styles.notfiBody}>{item.body}</div>
                  <div className={styles.notfiTime}>
                    {dayjs(item.created_at).format("DD/MM/YYYY, hh:mm A")}
                  </div>

                  {jobId && (
                    <div
                      className={styles.notfiViewDetails}
                      onClick={() => openJob(jobId)}
                    >
                      View Details {" >"}
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <Spin size="small" spinning={loadingMore} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

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
                onClick={() => goToTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
     
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: fontSizeItems,
              selectable: true,
              selectedKeys: [fontSize],
              onClick: ({ key }) => setFontSize(key),
            }}
          >
            <button className={styles.buttonnew} title="Font Size">
              <Type size={20} />
            </button>
          </Dropdown>

          {/* Notifications — kept outside the desktop-only block so mobile keeps the bell */}
          <Popover
            trigger="click"
            placement="bottomRight"
            open={notificationVisible}
            onOpenChange={(v) => setNotificationVisible(v)}
            content={notificationContent}
          >
            <Badge
              count={displayCount}
              overflowCount={9}
              size="small"
              className={styles.badgenavnoti}
            >
              <button className={styles.buttonnew} title="Notifications">
                <Icon height="20" width="20" icon="mdi:bell-outline" />
              </button>
            </Badge>
          </Popover>

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
            {/* Change Password */}
            <Tooltip title="Change Password">
              <button
                onClick={() => setChangePasswordVisible(true)}
                className={styles.buttonnew}
              >
                <Icon height="20" width="20" icon="mdi:lock" />
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
                goToTab(tab.key);
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
            onClick={() => {
              setChangePasswordVisible(true);
              setDrawerVisible(false);
            }}
          
          </button>
          <button className={styles.navTab} style={{ width: "100%", textAlign: "left" }} onClick={() => setChangePasswordVisible(true)}>

            Change Password
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

   
      <ForgotPasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        change={true}
      />
    </nav>
  );
};

export default Navigation;
