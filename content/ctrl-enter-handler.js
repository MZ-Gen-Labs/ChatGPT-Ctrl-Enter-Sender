// ── Helper functions ─────────────────────────────────────────────────────────

function isEnterKey(event) {
  return event.code === "Enter" || event.code === "NumpadEnter";
}

function dispatchEnter(target, options) {
  target.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    bubbles: true,
    cancelable: true,
    ...options,
  }));
}

function findFormButton(target, selector) {
  const form = target.closest("form");
  if (form) {
    return form.querySelector(selector);
  }
  return null;
}

function insertTextareaNewline(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = value.substring(0, start) + "\n" + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + 1;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function isCursorAgentsPath(url) {
  try {
    const { pathname } = new URL(url);
    return /^\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?agents(?:\/|$)/.test(pathname);
  } catch (e) {
    return false;
  }
}

// ── Site behavior definitions ────────────────────────────────────────────────
// Ordered by tier (see CONTRIBUTING.md):
//   Tier 1: ChatGPT, Claude, Gemini, Copilot, M365
//   Tier 2: DeepSeek, Grok, Perplexity, Mistral, NotebookLM, GitHub
//   Tier 3: Poe, v0, Cursor

const SITE_BEHAVIORS = {

  // ── Tier 1 — Fully Supported ───────────────────────────────────────────────

  "chatgpt.com": {
    shouldHandle(event) {
      return event.target.id === "prompt-textarea" || event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      // Only handle Enter on the prompt textarea; other TEXTAREAs (edit mode) pass through
      if (event.target.id === "prompt-textarea") {
        event.preventDefault();
        dispatchEnter(event.target, { shiftKey: true });
      }
    },
    onCtrlEnter(event) {
      // Only intercept Ctrl (not Meta); Mac Cmd+Enter works natively on ChatGPT
      if (!event.ctrlKey) return;
      event.preventDefault();
      dispatchEnter(event.target, { metaKey: true });
    },
  },

  "claude.ai": {
    shouldHandle(event) {
      return (event.target.tagName === "DIV" && event.target.contentEditable === "true") ||
             event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
      // Claude edit mode: TEXTAREA needs manual newline insertion
      if (event.target.tagName === "TEXTAREA") {
        insertTextareaNewline(event.target);
      }
    },
    onCtrlEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.target.tagName === "TEXTAREA") {
        // Edit mode: synthetic Enter would double-submit
        const saveButton = findFormButton(event.target, 'button[type="submit"]:not([disabled])');
        if (saveButton) saveButton.click();
      } else {
        dispatchEnter(event.target, {});
      }
    },
  },

  "gemini.google.com": {
    shouldHandle(event) {
      const isQlEditor = event.target.tagName === "DIV" &&
        event.target.classList.contains("ql-editor") &&
        event.target.contentEditable === "true";
      const isTextarea = event.target.tagName === "TEXTAREA";
      // Let Shift+Enter pass through to site default
      const isShiftEnter = event.shiftKey && isEnterKey(event);
      return (isQlEditor || isTextarea) && !isShiftEnter;
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
    },
  },

  "copilot.microsoft.com": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.stopImmediatePropagation();
    },
  },

  "m365.cloud.microsoft": {
    shouldHandle(event) {
      const url = window.location.href;
      return url.startsWith("https://m365.cloud.microsoft/chat") &&
             event.target.id === "m365-chat-editor-target-element";
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { keyCode: 13 });
    },
  },

  // ── Tier 2 — Community Supported ───────────────────────────────────────────

  "chat.deepseek.com": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true, keyCode: 13, composed: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { keyCode: 13, composed: true });
    },
  },

  "grok.com": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA" ||
             (event.target.tagName === "DIV" && event.target.contentEditable === "true");
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
    },
  },

  "www.perplexity.ai": {
    shouldHandle(event) {
      return event.target.tagName === "DIV" && event.target.contentEditable === "true";
    },
    onEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
    },
  },

  "chat.mistral.ai": {
    shouldHandle(event) {
      return (event.target.tagName === "DIV" &&
              event.target.classList.contains("ProseMirror") &&
              event.target.contentEditable === "true") ||
             event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
    },
  },

  "notebooklm.google.com": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA" && event.target.classList.contains("query-box-input");
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
      const submitButton = document.querySelector('query-box form button[type="submit"]');
      if (submitButton) submitButton.click();
    },
  },

  "github.com": {
    shouldHandle(event) {
      const url = window.location.href;
      return (url.startsWith("https://github.com/copilot") || url.startsWith("https://github.com/spark")) &&
             event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      event.stopImmediatePropagation();
      dispatchEnter(event.target, {});
    },
  },

  // ── Tier 3 — Minimal Support ───────────────────────────────────────────────

  "poe.com": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA";
    },
    onEnter(event) {
      event.stopPropagation();
    },
  },

  "v0.app": {
    shouldHandle(event) {
      return event.target.tagName === "TEXTAREA" ||
             (event.target.tagName === "DIV" &&
              event.target.classList.contains("ProseMirror") &&
              event.target.contentEditable === "true");
    },
    onEnter(event) {
      if (event.target.tagName === "TEXTAREA") {
        event.stopPropagation();
      } else {
        // ProseMirror follow-up input
        event.preventDefault();
        event.stopImmediatePropagation();
        dispatchEnter(event.target, { shiftKey: true });
      }
    },
    onCtrlEnter(event) {
      if (event.target.tagName === "DIV") {
        event.preventDefault();
        event.stopImmediatePropagation();
        dispatchEnter(event.target, {});
      }
    },
  },

  "cursor.com": {
    shouldHandle(event) {
      const url = window.location.href;
      return isCursorAgentsPath(url) &&
             event.target.tagName === "DIV" &&
             event.target.contentEditable === "true" &&
             event.target.getAttribute("data-lexical-editor") === "true" &&
             event.target.getAttribute("role") === "textbox";
    },
    onEnter(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatchEnter(event.target, { shiftKey: true });
    },
    onCtrlEnter(event) {
      const button = findFormButton(event.target, 'button[type="submit"]:not([disabled])');
      if (button) {
        event.preventDefault();
        event.stopImmediatePropagation();
        button.click();
      }
    },
  },

  "x.com": {
    shouldHandle(event) {
      const url = window.location.href;
      if (!url.includes("x.com/i/grok")) return false;

      const target = event.target;
      const isEditable = target.getAttribute("contenteditable") === "true" || 
                         target.closest('[contenteditable="true"]') !== null;
      const isTextbox = target.getAttribute("role") === "textbox" || 
                        target.closest('[role="textbox"]') !== null;
      const isTextarea = target.tagName === "TEXTAREA";

      return isEditable || isTextbox || isTextarea;
    },
    onEnter(event) {
      // 1. 【通常のEnter（単体）が押された場合】 ──> 改行に強制変更
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Grok側の送信処理が1ミリ秒も動かないように、イベントをその場で「完全消滅」させます
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // 完全にイベントを止めた上で、エディタに物理的に改行（BR）をねじ込みます
        const activeInput = event.target.closest('[contenteditable="true"]') || event.target;
        if (activeInput.tagName === "TEXTAREA") {
          insertTextareaNewline(activeInput);
        } else {
          const selection = window.getSelection();
          if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            const br = document.createElement("br");
            range.deleteContents();
            range.insertNode(br);
            
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 入力内容が変わったことをGrok側に通知
            activeInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        return;
      }

      // 2. 【Shift+Enter が押された場合】 ──> 送信ボタンを強制クリック
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Grok本来 of 「Shift+Enter＝改行」という動きをここで完全にストップします
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // 画面上の送信ボタンを確実に特定してクリックします
        const submitButton = document.querySelector(
          'button[data-testid="grok_send_button"], ' +
          'button[aria-label*="送信"], button[aria-label*="Send"], ' +
          'form button[type="submit"], ' +
          'div[contenteditable="true"] ~ button, ' +
          '[role="textbox"] ~ button, ' +
          'button:has(svg)'
        );

        if (submitButton) {
          submitButton.click();
        }
        return;
      }

      // 3. 【Ctrl+Enter などの場合】 ──> そのまま送信処理へ流す
      if (event.ctrlKey || event.metaKey) {
        // 拡張機能は何もせず、Grokの元々の送信処理に任せます
        return;
      }
    },
    onCtrlEnter(event) {
      return;
    }
  },
};

// ── Unified handler ──────────────────────────────────────────────────────────

function handleCtrlEnter(event) {
  if (event.isComposing || !event.isTrusted) return;
  if (!isEnterKey(event)) return;

  const hostname = window.location.hostname;
  const behavior = SITE_BEHAVIORS[hostname];
  if (!behavior || !behavior.shouldHandle(event)) return;

  const isOnlyEnter = !event.ctrlKey && !event.metaKey;
  const isCtrlEnter = event.ctrlKey || event.metaKey;

  if (isOnlyEnter && behavior.onEnter) {
    behavior.onEnter(event);
  } else if (isCtrlEnter && behavior.onCtrlEnter) {
    behavior.onCtrlEnter(event);
  }
}

// ── Initialization ───────────────────────────────────────────────────────────

// Apply the setting based on the current site on initial load
applySiteSetting();

// Listen for changes to the site settings and apply them dynamically
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.siteSettings) {
    applySiteSetting();
  }
});
