(function () {
  function apiBase() {
    if (window.ZENITHY_MESSAGES_API) return String(window.ZENITHY_MESSAGES_API).replace(/\/$/, "");
    if ((location.hostname === "127.0.0.1" || location.hostname === "localhost") && location.port === "8080") {
      return "http://127.0.0.1:18081/api";
    }
    return "/api";
  }

  function getValue(id) {
    var node = document.getElementById(id);
    return node ? node.value.trim() : "";
  }

  function setFeedback(message, type) {
    var feedback = document.getElementById("collab-feedback");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.state = type || "info";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function downloadJson(filename, data) {
    var blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function createMessageEntry(name, email, message, website) {
    var now = new Date();
    var id = "msg-" + now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return {
      id: id,
      name: name || "",
      email: email,
      message: message,
      website: website || "",
      status: "unread",
      createdAt: now.toISOString(),
      source: "zenithy-home",
    };
  }

  function submitToApi(entry) {
    return fetch(apiBase() + "/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: entry.name,
        email: entry.email,
        message: entry.message,
        website: entry.website,
      }),
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || "submit_failed");
        }
        if (!payload.message || !payload.message.id) {
          throw new Error("server_not_persisted");
        }
        return payload;
      });
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    var name = getValue("collab-name");
    var email = getValue("collab-email");
    var message = getValue("collab-message");
    var website = getValue("collab-website");

    if (!email) {
      setFeedback("请先填写邮箱。", "error");
      return;
    }
    if (!isEmail(email)) {
      setFeedback("邮箱格式看起来不正确，请检查后再提交。", "error");
      return;
    }
    if (!message) {
      setFeedback("请填写想法或留言内容。", "error");
      return;
    }

    if (message.length > 1200) {
      setFeedback("留言内容有点长，请压缩到 1200 字以内再提交。", "error");
      return;
    }

    var entry = createMessageEntry(name, email, message, website);
    setFeedback("正在提交留言...", "info");
    submitToApi(entry)
      .then(function (payload) {
        event.target.reset();
        setFeedback("留言已写入服务器，后台可见。编号：" + payload.message.id, "success");
      })
      .catch(function () {
        downloadJson(entry.id + ".json", entry);
        setFeedback("未写入服务器，后台暂时看不到；已下载本地备份，请稍后重试或后台导入。", "info");
      });
  }

  function boot() {
    var form = document.getElementById("collab-form");
    if (!form) return;
    form.addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
