import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./dayjs-config";
import "./index.css";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import App from "./App.jsx";
import FontSizeProvider from "./Components/FontSizeProvider.jsx";
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
const CsUpdate       = lazy(() => import("./Components/Approval/pages/CsUpdate.jsx"));
const HodReview      = lazy(() => import("./Components/Approval/pages/HodReview.jsx"));
const CnfUpdate      = lazy(() => import("./Components/Approval/pages/CnfUpdate.jsx"));
const CsDocuments    = lazy(() => import("./Components/Approval/pages/CsDocuments.jsx"));
const CsHodApproval  = lazy(() => import("./Components/Approval/pages/CsHodApproval.jsx"));
const AccountsUpdate = lazy(() => import("./Components/Approval/pages/AccountsUpdate.jsx"));
const AccountsDashboard = lazy(() => import("./Components/Approval/pages/AccountsDashboard.jsx"));
const SalesInput = lazy(() => import("./Components/SalesInput/SalesInput.jsx"));
const ExportReport = lazy(() => import("./Components/ExportReport/Report.jsx"));
const MFA = lazy(() => import("./pages/login/MFA.jsx"));
const UpdateProfile = lazy(() => import("./pages/Profile/UpdateProfile.jsx"));

 
const authLoader = async () => {
  
  if (store.getState().auth.isAuthenticated) return null;

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
 
    shouldRevalidate: () => false,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <ApprovalDashboard /> },
      { path: "dashboard", element: <ApprovalDashboard /> },
      { path: "approval", element: <Approval /> },
      { path: "approval/:id/cs-update",       element: <CsUpdate /> },
      { path: "approval/:id/hod-review",      element: <HodReview /> },
      { path: "approval/:id/cnf-update",      element: <CnfUpdate /> },
      { path: "approval/:id/cs-documents",    element: <CsDocuments /> },
      { path: "approval/:id/cs-hod-approval", element: <CsHodApproval /> },
      { path: "approval/:id/accounts",        element: <AccountsUpdate /> },
      { path: "accounts-dashboard",           element: <AccountsDashboard /> },
      { path: "sales-input", element: <SalesInput /> },
      { path: "export-report", element: <ExportReport /> },
      { path: "profile", element: <UpdateProfile /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/mfa", element: <MFA /> },
  { path: "*", element: <ErrorFallback /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      {/* Owns the antd theme token so the font-size control can drive it */}
      <FontSizeProvider>
        <RouterProvider router={router} />
      </FontSizeProvider>
    </Provider>
  </StrictMode>,
);
