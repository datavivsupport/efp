import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import App from "./App.jsx";
import apiClient from "./api/apiclient";
import { setUser } from "./store/authSlice.js";
import { store } from "./store/store.js";
import { Provider } from "react-redux";

const Login = lazy(() => import("./pages/login/login.jsx"));
const ErrorFallback = lazy(
  () => import("./Components/ErrorFallback/ErrorFallback.jsx"),
);
const ApprovalDashboard = lazy(
  () => import("./Components/ApprovalDashboard/ApprovalDashboard.jsx"),
);
const Approval = lazy(() => import("./Components/Approval/Approval.jsx"));
const SalesInput = lazy(() => import("./Components/SalesInput/SalesInput.jsx"));
const ExportReport = lazy(() => import("./Components/ExportReport/Report.jsx"));
const MFA = lazy(() => import("./pages/login/MFA.jsx"));

/* -----------------------------
   COOKIE BASED AUTH LOADER
------------------------------ */
const authLoader = async () => {
  try {
    const res = await apiClient.get("/accounts/me", {
      withCredentials: true, // VERY IMPORTANT
    });
    store.dispatch(setUser(res.data.data));
    return null; // user authenticated
  } catch (error) {
    throw redirect("/login");
  }
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    loader: authLoader,
    children: [
      { path: "dashboard", element: <ApprovalDashboard /> },
      { path: "approval", element: <Approval /> },
      { path: "sales-input", element: <SalesInput /> },
      { path: "export-report", element: <ExportReport /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/mfa", element: <MFA /> },
  { path: "*", element: <ErrorFallback /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
