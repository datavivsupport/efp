import React, { Suspense } from "react";
import { Outlet } from "react-router";
import { Spin } from "antd";
import Navigation from "./Components/Navigation/Navbar";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

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