import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";
import Login from './pages/login/login.jsx';
import ErrorFallback from './Components/ErrorFallback/ErrorFallback.jsx';

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
  },
  {
    path: "*",
    element: <ErrorFallback />
  }
]);
createRoot(document.getElementById('root')).render(
  <StrictMode>
      <RouterProvider router={router} />
  </StrictMode>
)
