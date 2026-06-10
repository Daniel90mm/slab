const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

function registerExternalPreview(vscode, commandId, getPreviewDocument) {
  const state = {
    server: null,
    refreshTimer: null,
    port: null,
    version: 0,
    current: null,
  };

  const scheduleRefresh = () => {
    if (!state.server) {
      return;
    }

    if (state.refreshTimer) {
      clearTimeout(state.refreshTimer);
    }

    state.refreshTimer = setTimeout(() => {
      state.refreshTimer = null;
      void refreshPreview();
    }, 120);
  };

  const ensureServer = async () => {
    if (state.server) {
      return;
    }

    const server = http.createServer((request, response) => {
      void handleRequest(request, response, state);
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Could not start Slab preview server."));
          return;
        }

        state.server = server;
        state.port = address.port;
        resolve();
      });
    });
  };

  const openPreview = async () => {
    await ensureServer();
    await refreshPreview();

    const ok = await vscode.env.openExternal(
      vscode.Uri.parse(`http://127.0.0.1:${state.port}/preview`),
    );

    if (!ok) {
      throw new Error("Could not open the external Slab preview window.");
    }
  };

  const refreshPreview = async () => {
    const preview = await Promise.resolve(getPreviewDocument());
    state.version += 1;
    state.current = preview
      ? {
        ...preview,
        markdown: rewritePreviewAssetPaths(preview.markdown, preview.baseDir, state.port),
      }
      : null;
  };

  return vscode.Disposable.from(
    vscode.commands.registerCommand(commandId, async () => {
      try {
        await openPreview();
      } catch (error) {
        console.error("[slab.preview]", error);
        const message = error instanceof Error ? error.message : String(error);
        await vscode.window.showErrorMessage(message);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      scheduleRefresh();
    }),
    vscode.window.onDidChangeActiveNotebookEditor(() => {
      scheduleRefresh();
    }),
    vscode.workspace.onDidChangeTextDocument(() => {
      scheduleRefresh();
    }),
    vscode.workspace.onDidChangeConfiguration(() => {
      scheduleRefresh();
    }),
    {
      dispose() {
        if (state.refreshTimer) {
          clearTimeout(state.refreshTimer);
        }

        if (state.server) {
          state.server.close();
        }
      },
    },
  );
}

async function handleRequest(request, response, state) {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (url.pathname === "/preview") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPreviewShell());
    return;
  }

  if (url.pathname === "/api/document") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify(state.current ? {
      version: state.version,
      label: state.current.label,
      sourceLabel: state.current.sourceLabel,
      markdown: state.current.markdown,
    } : {
      version: state.version,
      label: "Slab Preview",
      sourceLabel: "Unavailable",
      markdown: "Open a markdown file or notebook to preview compiled markdown, LaTeX, and images.",
    }));
    return;
  }

  if (url.pathname === "/file") {
    const requestedPath = url.searchParams.get("path");
    const baseDir = state.current?.baseDir;

    if (!requestedPath || !baseDir || !isPathInsideBaseDir(requestedPath, baseDir)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    try {
      const bytes = await fs.promises.readFile(requestedPath);
      response.writeHead(200, {
        "content-type": detectMimeType(requestedPath),
        "cache-control": "no-store",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
    return;
  }

  response.writeHead(404);
  response.end("Not found");
}

function renderPreviewShell() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        background: #111111;
        color: #f2efe8;
        font-family: Georgia, "Times New Roman", serif;
      }
      .shell {
        max-width: 920px;
        margin: 0 auto;
        padding: 24px 28px 48px;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }
      .eyebrow {
        font: 600 11px/1.2 system-ui, sans-serif;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #9a9488;
        margin-bottom: 6px;
      }
      h1 {
        margin: 0;
        font: 700 24px/1.05 system-ui, sans-serif;
      }
      button {
        border: 1px solid #3a3a3a;
        background: transparent;
        color: #f2efe8;
        padding: 7px 12px;
        cursor: pointer;
        font: 500 12px/1.2 system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      article {
        line-height: 1.7;
        font-size: 18px;
      }
      article h1, article h2, article h3, article h4 {
        font-family: system-ui, sans-serif;
        line-height: 1.15;
        margin-top: 1.5em;
      }
      article pre {
        overflow-x: auto;
        padding: 12px 14px;
        border: 1px solid #2c2c2c;
        background: #171717;
      }
      article code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      article img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.2em 0;
      }
      article table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.2em 0;
      }
      article th, article td {
        border: 1px solid #333333;
        padding: 6px 8px;
        text-align: left;
      }
      article hr {
        border: none;
        border-top: 1px solid #2f2f2f;
        margin: 1.8em 0;
      }
    </style>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']]
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
        }
      };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div>
          <div class="eyebrow" id="source-label">Loading</div>
          <h1 id="title">Slab Preview</h1>
        </div>
        <button id="refresh">Refresh</button>
      </div>
      <article id="content"></article>
    </div>
    <script>
      let currentVersion = -1;
      const title = document.getElementById('title');
      const sourceLabel = document.getElementById('source-label');
      const content = document.getElementById('content');
      const refreshButton = document.getElementById('refresh');

      async function applyPayload(payload) {
        if (!payload || payload.version === currentVersion) {
          return;
        }

        currentVersion = payload.version;
        title.textContent = payload.label || 'Slab Preview';
        sourceLabel.textContent = payload.sourceLabel || 'Preview';
        content.innerHTML = marked.parse(payload.markdown || '', { gfm: true, breaks: false });

        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise([content]);
        }
      }

      async function refresh() {
        const response = await fetch('/api/document', { cache: 'no-store' });
        const payload = await response.json();
        await applyPayload(payload);
      }

      refreshButton.addEventListener('click', () => {
        void refresh();
      });

      setInterval(() => {
        void refresh();
      }, 700);

      void refresh();
    </script>
  </body>
</html>`;
}

function rewritePreviewAssetPaths(markdown, baseDir, port) {
  if (!baseDir || !port) {
    return String(markdown || "");
  }

  return String(markdown || "")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, altText, rawPath) => {
      const uri = resolvePreviewAssetUrl(baseDir, rawPath, port);
      return uri ? `![${altText}](${uri})` : match;
    })
    .replace(/<img([^>]*?)src=(['"])(.+?)\2([^>]*)>/gi, (match, before, quote, rawPath, after) => {
      const uri = resolvePreviewAssetUrl(baseDir, rawPath, port);
      return uri ? `<img${before}src=${quote}${uri}${quote}${after}>` : match;
    });
}

function resolvePreviewAssetUrl(baseDir, rawPath, port) {
  if (!rawPath || /^(?:https?:|data:|mailto:|#)/i.test(rawPath)) {
    return null;
  }

  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(baseDir, rawPath);
  return `http://127.0.0.1:${port}/file?path=${encodeURIComponent(filePath)}`;
}

function isPathInsideBaseDir(filePath, baseDir) {
  const relative = path.relative(baseDir, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function detectMimeType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

module.exports = {
  detectMimeType,
  isPathInsideBaseDir,
  registerExternalPreview,
  resolvePreviewAssetUrl,
  rewritePreviewAssetPaths,
};
