import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Spin } from "antd";
import Navigation from "./Components/Navigation/Navbar";
import apiClient from "./api/apiclient";

const PAGE_SIZE = 10;

const App = () => {
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const location = useLocation();

  /* -----------------------------
     NOTIFICATIONS
     Backend returns only unread notifications from the last 7 days,
     so "mark as read" doubles as "dismiss".
  ------------------------------ */
  const getNotification = useCallback(async (pageToFetch = 1) => {
    try {
      // skipErrorHandler: a failed poll must not raise a global error toast
      const res = await apiClient.get(
        `/accounts/notifications/?page=${pageToFetch}`,
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

      // Deeper in the list: drop it locally so the scroll position survives,
      // but refetch once the visible page would be left short.
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

  // Fires on mount and on every route change. The lint rule below assumes any
  // setState reached from an effect body is synchronous; here it happens after
  // an awaited request, so it can't cascade renders.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getNotification(1);
  }, [location.pathname, getNotification]);

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
