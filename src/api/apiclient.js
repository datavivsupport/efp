import { notification } from "antd";
import axios from "axios";

const variesError = ["/mfa", "/invoice-approval"];
const isBookingDynamic = ["/booking/"];
const apiAuth = ["/accounts/login", "/accounts/mfa", "/accounts/logout"];

export const abortController = new AbortController();

let activeNotificationKey = null;
export let isLoggingOut = false;

export const startLogout = () => {
  isLoggingOut = true;
};

export const finishLogout = () => {
  isLoggingOut = false;
};

/* ================================
   GLOBAL ERROR NOTIFICATION
================================ */

export const showError = (title, description) => {
  const key = "global_error_notification";

  notification.error({
    key,
    message: title,
    description,
    placement: "topRight",
    duration: 4,
    style: {
      borderRadius: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    },
    onClose: () => {
      activeNotificationKey = null;
    },
  });

  activeNotificationKey = key;
};

export const errorHandle = (data, returnMsg = false) => {
  const formatKey = (keyPath) =>
    keyPath
      .split(".")
      .map((part) =>
        part.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      )
      .join(" → ");

  let finalMessage = "";

  if (data?.errors && typeof data.errors === "object") {
    const messages = [];

    const extractMessages = (obj, parentKey = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        if (Array.isArray(value)) {
          if (!parentKey) messages.push(value[0]);
          else messages.push(`${formatKey(key)}: ${value[0]}`);
        } else if (typeof value === "object" && value !== null) {
          extractMessages(value, fullKey);
        }
      });
    };

    extractMessages(data.errors);

    finalMessage =
      messages.length > 0
        ? messages.slice(0, 3).join("\n")
        : "Please review your input and try again.";

    if (!returnMsg) showError("Validation Error", finalMessage);
    return finalMessage;
  }

  if (typeof data === "object" && data !== null) {
    const [firstKey, firstValue] = Object.entries(data)[0] || [];

    if (firstKey && firstValue) {
      const errMsg = Array.isArray(firstValue)
        ? firstValue[0]
        : firstValue;

      finalMessage =
        typeof errMsg === "string" && !errMsg.trim().startsWith("<")
          ? errMsg
          : "An unexpected error occurred. Please try again later.";

      if (!returnMsg) showError("Error", finalMessage);
      return finalMessage;
    }
  }

  finalMessage = "An unexpected error occurred. Please try again later.";
  if (!returnMsg) showError("Error", finalMessage);
  return finalMessage;
};


const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});


const controllers = new Set();

apiClient.interceptors.request.use((config) => {
  // Block requests after logout
  if (isLoggingOut && config.url !== "/accounts/logout") {
    return Promise.reject({
      __CANCEL__: true,
      message: "Blocked after logout",
    });
  }

  if (!config.signal) {
    const controller = new AbortController();
    config.signal = controller.signal;

    config.__controller = controller;
    controllers.add(controller);
  }

  return config;
});

export const cancelAllRequests = () => {
  controllers.forEach((c) => c.abort());
  controllers.clear();
};

apiClient.interceptors.response.use(
  (response) => {
    const url = response.config?.url || "";

    if (apiAuth.some((path) => url.startsWith(path))) {
      localStorage.removeItem("sessionExpiry");
      localStorage.removeItem("logoutWarningShown");
      localStorage.removeItem("open_tabs");
      localStorage.removeItem("draft_modal_shown");
      localStorage.removeItem("allocation_modal_shown");
    }

    return response;
  },
  (error) => {
    console.error(error);

    if (error.config?.skipErrorHandler) {
      return Promise.reject(error);
    }

    // Silent cancellation
    if (
      error.name === "AbortError" ||
      error.name === "CanceledError" ||
      error.code === "ERR_CANCELED" ||
      axios.isCancel(error)
    ) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401) {
      showError(
        "Session Expired",
        "Your session has ended. Please log in again."
      );
      window.location.href = `/login?redirect=${window.location.pathname}`;
    } 
    else if (status === 403) {
      showError(
        "Access Restricted",
        "You don't have permission to view this page."
      );
      window.location.href = "/unauthorized";
    } 
    else if (status === 429) {
      showError(
        "Too Many Requests",
        "Please wait and try again."
      );
    } 
    else if (status === 502) {
      showError(
        "Server Unreachable",
        "The server is temporarily unavailable."
      );
    } 
    else if (status === 500) {
      showError(
        "Something Went Wrong",
        "Please try again later."
      );
    } 
    else if (status === 413) {
      showError(
        "File Too Large",
        "The file you are trying to upload is too large."
      );
    } 
    else if (error.code === "ERR_NETWORK") {
      showError(
        "Network Error",
        "Check your internet connection."
      );
    } 
    else if (error.response?.data) {
      const data = error.response.data;
      errorHandle(data);
    } 
    else {
      showError(
        "Error",
        "An unexpected error occurred. Please try again later."
      );
    }

    return Promise.reject(
      error instanceof Error
        ? error
        : new Error(error?.message || "Unknown error occurred")
    );
  }
);

export default apiClient;