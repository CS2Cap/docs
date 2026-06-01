import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "https://e.cs2cap.com",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  disable_surveys: true,
  disable_surveys_automatic_display: true,
  disable_session_recording: true,
  debug: process.env.NODE_ENV === "development",
});
