import { setBaseUrl } from "@workspace/api-client-react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

setBaseUrl(import.meta.env.VITE_API_URL ?? "https://gamerbuddy-api-server.vercel.app");

createRoot(document.getElementById("root")!).render(<App />);
