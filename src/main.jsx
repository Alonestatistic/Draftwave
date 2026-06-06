import React from "react";
import { createRoot } from "react-dom/client";

window.React = React;
window.ReactDOM = { createRoot };

async function boot() {
  await import("../engine.jsx");
  await import("../ui.jsx");
  await import("../contextmenu.jsx");
  await import("../capabilities.jsx");
  await import("../project.jsx");
  await import("../audiocore.jsx");
  await import("../phase3.jsx");
  await import("../phase4.jsx");
  await import("../settings.jsx");
  await import("../transport.jsx");
  await import("../browser.jsx");
  await import("../arrangement.jsx");
  await import("../pianoroll.jsx");
  await import("../mixer.jsx");
  await import("../aiproviders.jsx");
  await import("../aisettings.jsx");
  await import("../assistant.jsx");
  await import("../app.jsx");
}

boot().catch((error) => {
  console.error("The DAW failed to boot", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="padding:24px;color:#ff5f73;font-family:sans-serif">The DAW failed to boot: ${String(error?.message || error)}</div>`;
  }
});
