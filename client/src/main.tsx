import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";


// Disable mouse scroll changing values on number inputs
document.addEventListener("wheel", (event) => {
  if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "number") {
    document.activeElement.blur();
  }
});

// Disable keyboard arrow keys changing values on number inputs
document.addEventListener("keydown", (event) => {
  if (
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.type === "number" &&
    (event.key === "ArrowUp" || event.key === "ArrowDown")
  ) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
