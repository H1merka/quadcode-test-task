import React from "react";
import ReactDOM from "react-dom/client";
import { InteractiveComponent } from "../InteractiveComponent";
import "../globals.v4.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <InteractiveComponent />
  </React.StrictMode>
);
