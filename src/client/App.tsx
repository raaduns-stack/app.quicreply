import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import CookieConsentBanner from "./components/cookie-consent/Banner";

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <>
      <div className="bg-background text-foreground min-h-screen">
        <Outlet />
      </div>
      <Toaster position="bottom-right" />
      <CookieConsentBanner />
    </>
  );
}
