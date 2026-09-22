import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation } from "react-router";
import { Spin, notification } from "antd";
import Navigation from "./Components/Navigation/Navbar";
import apiClient from "./api/apiclient";
import { onMessageListener, requestForToken } from "./firebase/firebase";

const PAGE_SIZE = 10;

const App = () => {
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const location = useLocation();

  // Scroll fires many times per tick, so the in-flight check has to read a ref
  // rather than the render-time `loadingMore` value, which every one of those
  // handlers would still see as false.
  const loadingMoreRef = useRef(false);
  // Only the newest fetch may write to state; a page-1 refresh landing during a
  // "load more" would otherwise merge a stale page back in.
  const fetchSeqRef = useRef(0);

  const getNotification = useCallback(async (pageToFetch = 1) => {
    const seq = ++fetchSeqRef.current;

    try {
      // skipErrorHandler: a failed poll must not raise a global error toast
      const res = await apiClient.get(
        `/accounts/notifications/?page=${pageToFetch}&live=true`,
        { skipErrorHandler: true },
      );
      if (seq !== fetchSeqRef.current) return;

      const results = Array.isArray(res.data?.results) ? res.data.results : [];

      setNotifications((prev) => {
        if (pageToFetch === 1) return results;

        // Offset pagination re-serves an item when a new notification lands
        // between two page fetches, so merge on id instead of appending blind.
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...results.filter((n) => !seen.has(n.id))];
      });
      setPage(pageToFetch);
      setTotalUnread(res.data?.count ?? 0);
      setHasNextPage(Boolean(res.data?.next));
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const loadNextPage = async () => {
    if (!hasNextPage || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await getNotification(page + 1);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
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

    // An account can hold several FCM tokens, so one event arrives as several
    // identical pushes. Keyed toasts replace rather than stack, and the recent
    // window stops a repeat from re-opening a toast the user already dismissed.
    const seenPushes = new Map();

    const pushKey = (payload) => {
      const data = payload?.data || {};
      const notif = payload?.notification || {};

      return (
        data.notification_id ||
        [
          data.sales_input_id || "",
          notif.title || "",
          notif.body || "",
        ].join("|")
      );
    };

    const isRepeat = (key) => {
      const now = Date.now();
      seenPushes.forEach((seenAt, k) => {
        if (now - seenAt > 60_000) seenPushes.delete(k);
      });

      if (seenPushes.has(key)) return true;
      seenPushes.set(key, now);
      return false;
    };

    const unsubscribe = onMessageListener((payload) => {
      const key = pushKey(payload);
      if (isRepeat(key)) return;

      notification.open({
        key,
        message: payload?.notification?.title,
        description: payload?.notification?.body,
        onClick: () => {
          const link = payload?.data?.VIEW_INVOICE_URL;
          if (link) window.location.href = link;
        },
      });
      getNotification(1);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
