import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="flex min-h-dvh w-full min-h-0 flex-col">
        <App />
      </div>
    </BrowserRouter>
  </StrictMode>,
);
