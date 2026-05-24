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

  "x.com": {
    shouldHandle(event) {
      const url = window.location.href;
      if (!url.includes("x.com/i/grok")) return false;

      const target = event.target;

      // 1. contenteditable on target or any ancestor
      const isEditable = target.getAttribute("contenteditable") === "true" ||
                         target.closest('[contenteditable="true"]') !== null;

      // 2. role=textbox on target or any ancestor
      const isTextbox = target.getAttribute("role") === "textbox" ||
                        target.closest('[role="textbox"]') !== null;

      // 3. Lexical / Draft.js editor class or attribute on target or ancestor
      const hasEditorClass = target.classList.contains("public-DraftEditor-content") ||
                             target.closest(".public-DraftEditor-content") !== null ||
                             target.closest('[data-lexical-editor="true"]') !== null;

      // 4. Plain TEXTAREA
      const isTextarea = target.tagName === "TEXTAREA";

      return isEditable || isTextbox || hasEditorClass || isTextarea;
    },
    onEnter(event) {
      // ── a. Shift+Enter → Submit ───────────────────────────────────────────
      // (Shift+Enter also routes through onEnter because the unified handler
      //  routes any non-Ctrl/Meta Enter to onEnter regardless of shiftKey)
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Stage 1: find and click the visible send button
        // Try progressively broader selectors to handle Grok UI changes
        const submitButton =
          document.querySelector('button[data-testid="grok_send_button"]') ||
          document.querySelector('button[aria-label*="Send"]') ||
          document.querySelector('button[aria-label*="送信"]') ||
          document.querySelector('button[aria-label*="grok"]') ||
          document.querySelector('form button[type="submit"]:not([disabled])') ||
          // Last resort: any enabled button containing an SVG near the editor
          [...document.querySelectorAll('button:not([disabled])')]
            .find(btn => btn.querySelector('svg') &&
                         btn.closest('form, [role="main"]'));

        if (submitButton && !submitButton.disabled) {
          submitButton.click();
          return;
        }

        // Stage 2: dispatch a new KeyboardEvent with shiftKey:false
        // The extension's own listener ignores isTrusted:false events,
        // so this reaches Grok's keydown handler directly.
        event.target.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        }));
        return;
      }

      // ── b. Ctrl/Cmd+Enter → pass through (Grok's native submit) ──────────
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      // ── c. Plain Enter → Newline ──────────────────────────────────────────
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Resolve the actual editable element (may be an ancestor of event.target)
      const activeInput = event.target.closest('[contenteditable="true"]') || event.target;

      if (activeInput.tagName === "TEXTAREA") {
        insertTextareaNewline(activeInput);
      } else {
        // contenteditable: insert <br> at cursor position
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
          // Notify Grok's JS that the content changed
          activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    },
    onCtrlEnter(event) {
      // Ctrl/Cmd+Enter: pass through so Grok's native Enter-to-submit fires
      return;
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
