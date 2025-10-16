// backend/server.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// public dentro de backend/
const publicDir = path.join(__dirname, "public");
console.log("Servir estáticos desde:", publicDir);
app.use(express.static(publicDir));

// Helper: detecta la ubicación del posts.json (intenta dos caminos comunes)
function resolvePostsPath() {
  const candidates = [
    path.join(__dirname, "data", "posts.json"),       // backend/data/posts.json
    path.join(__dirname, "..", "data", "posts.json"), // ../data/posts.json
    path.join(__dirname, "..", "..", "data", "posts.json")
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("posts.json encontrado en:", p);
      return p;
    }
  }
  console.warn("posts.json no encontrado. Se probará el primer candidato:", candidates[0]);
  return candidates[0];
}

// Escape básico para evitar XSS en strings simples (única definición)
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Helper: intenta cargar HTML de un archivo asociado al post ---
function slugify(str = '') {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadPostHtml(post) {
  // directorios donde podrías tener los html de los posts (ajusta si hace falta)
  const candidatesDirs = [
    path.join(__dirname, 'posts-html'),         // backend/posts-html
    path.join(__dirname, '..', 'posts-html'),  // ../posts-html
    path.join(__dirname, '..', '..', 'posts-html') // ../../posts-html
  ];

  const idName = String(post.id || '').trim();
  const slugName = post.slug ? String(post.slug).trim() : slugify(post.title || idName);

  for (const dir of candidatesDirs) {
    if (!fs.existsSync(dir)) continue;
    const byId = path.join(dir, `${idName}.html`);
    const bySlug = path.join(dir, `${slugName}.html`);
    if (idName && fs.existsSync(byId)) return fs.readFileSync(byId, 'utf8');
    if (slugName && fs.existsSync(bySlug)) return fs.readFileSync(bySlug, 'utf8');
  }

  // fallback: si post.html ya existe en el JSON, retornarlo; si no, construir desde excerpt
  if (post.html && typeof post.html === 'string') return post.html;
  if (post.excerpt) return `<p>${escapeHtml((post.excerpt || '').replace(/\n/g, '</p><p>'))}</p>`;
  return '<p>No hay contenido disponible.</p>';
}

// --- Posts ---
function loadPosts() {
  const dataPath = resolvePostsPath();
  if (!fs.existsSync(dataPath)) {
    console.warn("loadPosts: posts.json no encontrado en:", dataPath);
    return [];
  }
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("loadPosts: posts.json no es array. Comprobar formato.");
      return [];
    }
    console.log(`loadPosts: cargados ${parsed.length} posts desde ${dataPath}`);
    return parsed;
  } catch (err) {
    console.error("Error leyendo/parsing posts.json:", err);
    return [];
  }
}

// --- Cartas ---
function loadCartas() {
  const file = path.join(__dirname, "data", "cartas.json");
  try {
    if (!fs.existsSync(file)) {
      console.warn("loadCartas: cartas.json no encontrado en:", file);
      return [];
    }
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    const charts = Array.isArray(data.charts) ? data.charts : [];
    console.log(`loadCartas: cargadas ${charts.length} cartas desde ${file}`);
    return charts;
  } catch (err) {
    console.error("Error leyendo data/cartas.json:", err.message);
    return [];
  }
}

// --- Render de carta ---
function renderCartaPage(chart) {
  const title = escapeHtml(chart.person_name || 'Carta natal');
  const birth = chart.birth ? escapeHtml((chart.birth.date || '') + ' ' + (chart.birth.time || '') + ' ' + (chart.birth.timezone || '')) : '';
  const summary = escapeHtml(chart.summary || '');
  const positionsTable = (chart.positions || []).length
    ? `<pre>${escapeHtml(JSON.stringify(chart.positions, null, 2))}</pre>`
    : '<p class="muted">No hay posiciones.</p>';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body>
  <a href="/cartas">← Volver</a>
  <h1>${title}</h1>
  <p>${birth}</p>
  <p>${summary}</p>
  <section>${positionsTable}</section>
</body></html>`;
}

// --- Render de post ---
function renderPostHtml(post) {
  // valores seguros para meta / imagen / excerpt
  const title = escapeHtml(post.title || "Post");
  const safeCover = escapeHtml(post.coverImage || "/images/default-cover.jpg");
  const safeExcerpt = escapeHtml(post.excerpt || "");
  const safeTags = (post.tags || []).map(t => escapeHtml(t)).join(', ');

  // Prioridad para contenido del post:
  // 1) post.content
  // 2) post.html
  // 3) archivo externo en posts-html/ (loadPostHtml maneja esto)
  // 4) fallback: excerpt convertido a párrafos
  let bodyHtml = "";
  if (post.content && typeof post.content === "string" && post.content.trim()) {
    bodyHtml = post.content;
  } else if (post.html && typeof post.html === "string" && post.html.trim()) {
    bodyHtml = post.html;
  } else {
    bodyHtml = loadPostHtml(post);
  }

  if (!bodyHtml || String(bodyHtml).trim().length < 20) {
    console.warn(`renderPostHtml: contenido corto para post id=${post.id} title="${post.title}" — revisa post.content / post.html / posts-html/`);
  }

  return `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>

    <!-- Hoja de estilos principal del blog (debe existir en public/styles-blog.css) -->
    <link rel="stylesheet" href="/styles2.css">

    <!-- Fallback CSS mínimo si falta la hoja externa -->
    <!--style>
      body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; line-height: 1.6; padding: 20px; background:#fff; color:#111; }
      .container { max-width: 860px; margin: 0 auto; }
      .post-cover { width:100%; height:360px; background-size:cover; background-position:center; border-radius:8px; margin-bottom:18px; }
      .post-meta { color:#666; font-size:0.95rem; margin-bottom:12px; }
      .post-content img { max-width:100%; height:auto; display:block; margin:8px 0; }
      pre { background:#111; color:#fff; padding:12px; overflow:auto; border-radius:6px; }
      .tags { margin-top:18px; font-size:0.95rem; color:#444; }
    </style -->
  </head>
  <body>
    <div class="container">
      <a href="/blog">← Volver al blog</a>
      <h1>${title}</h1>
      <div class="post-meta">${post.date ? escapeHtml(new Date(post.date).toLocaleDateString()) : ""} • ${escapeHtml(safeTags || "")}</div>

      <div class="post-cover" style="background-image:url('${safeCover}');"></div>

      <div class="post-excerpt">${safeExcerpt}</div>

      <article class="post-content">
        ${bodyHtml}
      </article>

      <div class="tags">Tags: ${escapeHtml(safeTags)}</div>
    </div>
  </body>
  </html>`;
}


// --- RUTAS ---
// Blog index
app.get("/blog", (req, res) => {
  const posts = loadPosts();
  posts.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  if (!posts.length) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Blog</title></head><body><h1>Blog</h1><p>No se encontraron posts. Revisa data/posts.json</p></body></html>`);
  }

  const postsHtml = posts.map(p => {
    const safeTitle = escapeHtml((p.title || "").toLowerCase());
    const safeExcerpt = escapeHtml(p.excerpt || "");
    const safeCover = escapeHtml(p.coverImage || "/images/default-cover.jpg");
    const safeTags = p.tags || [];
    const readingMinutes = p.readingMinutes || Math.max(1, Math.round(((p.content || "").replace(/<[^>]+>/g, "").split(/\s+/).length) / 200));
    const dataTags = escapeHtml(JSON.stringify(safeTags));
    return `
      <article class="card" data-tags='${dataTags}' data-title="${safeTitle}">
        <a class="card-link" href="/blog/${encodeURIComponent(p.id)}">
          <div class="card-media" style="background-image:url('${safeCover}')"></div>
          <div class="card-body">
            <h3>${escapeHtml(p.title)}</h3>
            <p class="meta">${p.date ? escapeHtml(new Date(p.date).toLocaleDateString()) : ""} • ${readingMinutes} min</p>
            <p class="excerpt">${safeExcerpt}</p>
            <div class="card-tags">${(safeTags || []).map(t=>`<span class="pill">${escapeHtml(t)}</span>`).join(' ')}</div>
          </div>
        </a>
      </article>
    `;
  }).join("\n");

  // Corregido: definir lista de tags única
  const tags = Array.from(new Set(posts.flatMap(p => (p.tags || []).map(String)))).filter(Boolean);
  const tagsHtml = tags.map(t => `<button class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("\n");

  const html = `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Blog — Agente Astrológico</title>
    <meta name="description" content="Artículos Jyotish y astrología práctica.">
    <link rel="stylesheet" href="/styles-blog.css">
  </head>
  <body>
    <header class="blog-header">
      <div class="container">
        <h1>Blog — Agente Astrológico</h1>
        <p class="lead">Artículos Jyotish sobre cada signo y tránsitos astrológicos.</p>
      </div>
    </header>

    <main class="container">
      <section class="controls">
        <input id="searchInput" placeholder="Buscar por título o palabra clave..." />
        <div class="tags">
          <button class="tag active" data-tag="all">Todos</button>
          ${tagsHtml}
        </div>
      </section>

      <section id="postsGrid" class="grid">
        ${postsHtml}
      </section>

      <nav class="pagination" id="pagination"></nav>
    </main>

    <footer class="site-footer">
      <div class="container">© ${new Date().getFullYear()} Agente Astrológico</div>
    </footer>

    <script>
      (function(){
        const postsPerPage = 6;
        const allCards = Array.from(document.querySelectorAll('#postsGrid .card'));
        const searchInput = document.getElementById('searchInput');
        const tagButtons = Array.from(document.querySelectorAll('.tag'));
        const paginationEl = document.getElementById('pagination');

        let activeTag = 'all';
        let query = '';

        function matches(card, q, tag) {
          const title = card.dataset.title || '';
          const tags = JSON.parse(card.dataset.tags || '[]');
          const titleMatch = title.includes(q);
          const contentMatch = (card.querySelector('.excerpt')?.textContent || '').toLowerCase().includes(q);
          const tagMatch = tag === 'all' ? true : tags.includes(tag);
          return (titleMatch || contentMatch) && tagMatch;
        }

        function render(page=1) {
          const filtered = allCards.filter(c => matches(c, query, activeTag));
          const total = filtered.length;
          const pages = Math.max(1, Math.ceil(total / postsPerPage));
          const start = (page-1)*postsPerPage;
          const end = start + postsPerPage;

          allCards.forEach(c => c.style.display = 'none');
          filtered.slice(start, end).forEach(c => c.style.display = '');

          paginationEl.innerHTML = '';
          if (pages > 1) {
            for (let i=1;i<=pages;i++){
              const btn = document.createElement('button');
              btn.textContent = i;
              if (i===page) btn.classList.add('active');
              btn.addEventListener('click', ()=> render(i));
              paginationEl.appendChild(btn);
            }
          }
        }

        searchInput.addEventListener('input', (e)=> {
          query = e.target.value.toLowerCase().trim();
          render(1);
        });

        tagButtons.forEach(b=>{
          b.addEventListener('click', ()=> {
            tagButtons.forEach(x=>x.classList.remove('active'));
            b.classList.add('active');
            activeTag = b.dataset.tag;
            render(1);
          });
        });

        render(1);
      })();
    </script>
  </body>
  </html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Ruta dinámica: post o carta
app.get("/blog/:id", (req, res) => {
  const id = String(req.params.id || "").toLowerCase();
  const posts = loadPosts();
  const post = posts.find(p => String(p.id || "").toLowerCase() === id);
  if (post) return res.send(renderPostHtml(post));

  const charts = loadCartas();
  const chart = charts.find(c => String(c.id || "").toLowerCase() === id);
  if (chart) return res.send(renderCartaPage(chart));

  res.status(404).send("<h2>Recurso no encontrado</h2><p><a href='/blog'>Volver al blog</a></p>");
});

// Rutas para cartas
app.get('/cartas', (req, res) => {
  const charts = loadCartas();
  const items = charts.map(ch => `<li><a href="/cartas/${encodeURIComponent(String(ch.id))}">${escapeHtml(ch.person_name || ch.id)}</a></li>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Cartas</title></head><body><h1>Cartas</h1><ul>${items}</ul></body></html>`);
});

app.get('/cartas/:id', (req, res) => {
  const id = String(req.params.id || '').toLowerCase();
  const charts = loadCartas();
  const chart = charts.find(c => String(c.id || '').toLowerCase() === id);
  if (!chart) return res.status(404).send("<h2>Carta no encontrada</h2><p><a href='/cartas'>Volver</a></p>");
  res.send(renderCartaPage(chart));
});

// healthcheck

app.get("/ping", (req, res) => res.json({ message: "pong 🏓", status: "ok" }));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} - publicDir=${publicDir}`);
});
