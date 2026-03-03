import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import App from "./App.jsx";

const Login = lazy(() => import("./pages/login/login.jsx"));
const ErrorFallback = lazy(() => import("./Components/ErrorFallback/ErrorFallback.jsx"));
const ApprovalDashboard = lazy(() => import("./Components/ApprovalDashboard/ApprovalDashboard.jsx"));
const Approval = lazy(() => import("./Components/Approval/Approval.jsx"));
const SalesInput = lazy(() => import("./Components/SalesInput/SalesInput.jsx"));
const ExportReport = lazy(() => import("./Components/ExportReport/Report.jsx"));

const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

const authLoader = () => {
  if (!isAuthenticated()) {
    throw redirect("/login");
  }
  return null;
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
  { path: "*", element: <ErrorFallback /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);