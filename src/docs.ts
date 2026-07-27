import webhookApiMd from "../docs/webhook-api.md";

// 把 markdown 安全嵌入 <script type="application/json"> —— 只需转义 < 防止提前闭合标签
function encode(md: string): string {
  return JSON.stringify(md).replace(/</g, "\\u003c");
}

export function renderDocsPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Poke · Webhook API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; background: #ffffff; }
  @media (prefers-color-scheme: dark) { body { background: #0d1117; } }
  .markdown-body {
    box-sizing: border-box;
    max-width: 860px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  @media (max-width: 767px) { .markdown-body { padding: 24px 16px 60px; } }
</style>
</head>
<body>
<article class="markdown-body" id="content">正在加载文档…</article>
<script type="application/json" id="md">${encode(webhookApiMd)}</script>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script>
  const md = JSON.parse(document.getElementById("md").textContent);
  document.getElementById("content").innerHTML = marked.parse(md);
</script>
</body>
</html>`;
}
