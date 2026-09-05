(() => {
  const loadWidget = () => {
    if (document.getElementById("context7-chat-widget")) return;

    const script = document.createElement("script");
    script.id = "context7-chat-widget";
    script.src = "https://context7.com/widget.js";
    script.async = true;
    script.dataset.library = "/llmstxt/cs2cap_llms-full_txt";
    script.dataset.color = "#1d6ef3";
    document.head.appendChild(script);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadWidget, { once: true });
  } else {
    loadWidget();
  }
})();
