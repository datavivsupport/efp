import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Spin, notification } from "antd";
import Navigation from "./Components/Navigation/Navbar";
import apiClient from "./api/apiclient";
import { onMessageListener, requestForToken } from "./firebase/firebase";

const PAGE_SIZE = 10;

// Push payload data values are strings; sales_input_id opens that job in Approval
const getNotificationPath = (data) =>
  data?.sales_input_id
    ? `/approval?id=${encodeURIComponent(data.sales_input_id)}`
    : "/dashboard";

const App = () => {
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

 
  const getNotification = useCallback(async (pageToFetch = 1) => {
    try {
      // skipErrorHandler: a failed poll must not raise a global error toast
      const res = await apiClient.get(
        `/accounts/notifications/?page=${pageToFetch}&live=true`,
        { skipErrorHandler: true },
      );
      const results = Array.isArray(res.data?.results) ? res.data.results : [];

      setNotifications((prev) =>
        pageToFetch === 1 ? results : [...prev, ...results],
      );
      setPage(pageToFetch);
      setTotalUnread(res.data?.count ?? 0);
      setHasNextPage(Boolean(res.data?.next));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const loadNextPage = async () => {
    if (!hasNextPage || loadingMore) return;
    setLoadingMore(true);
    await getNotification(page + 1);
    setLoadingMore(false);
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post("/accounts/notifications/mark-all-read/");
      await getNotification(1);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const markSingleAsRead = async (id) => {
    try {
      await apiClient.post("/accounts/notifications/mark-read/", { id });

      if (page === 1) {
        await getNotification(1);
        return;
      }

 
      const remaining = notifications.filter((n) => n.id !== id);
      if (remaining.length < PAGE_SIZE) {
        await getNotification(1);
      } else {
        setNotifications(remaining);
        setTotalUnread((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getNotification(1);
  }, [location.pathname, getNotification]);

 
  useEffect(() => {
    requestForToken();

    const unsubscribe = onMessageListener((payload) => {
      notification.open({
        message: payload?.notification?.title,
        description: payload?.notification?.body,
        onClick: () => navigate(getNotificationPath(payload?.data)),
      });
      getNotification(1);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A click on a background push reuses this tab; the service worker asks us to route
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const onServiceWorkerMessage = (event) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.path) {
        navigate(event.data.path);
      }
    };

    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    return () =>
      navigator.serviceWorker.removeEventListener(
        "message",
        onServiceWorkerMessage,
      );
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        notifications={notifications}
        markAllAsRead={markAllAsRead}
        markSingleAsRead={markSingleAsRead}
        totalUnread={totalUnread}
        hasMore={hasNextPage}
        loadMore={loadNextPage}
        loadingMore={loadingMore}
      />

      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "80vh",
            }}
          >
            <Spin size="large" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
};

export default App;
