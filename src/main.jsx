import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";
import Login from './pages/login/login.jsx';
import { ToastProvider } from "./pages/UIChanges/toast"
import { Toaster } from "./pages/UIChanges/toaster"

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
  },
  {
    path: "/login",
    element: <Login />,
  }
]);
createRoot(document.getElementById('root')).render(
<ToastProvider>
  <StrictMode>
    <RouterProvider router={router} />,
    <Toaster />
  </StrictMode>,
 </ToastProvider>
)
