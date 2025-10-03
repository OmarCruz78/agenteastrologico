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
    path.join(__dirname, "..", "..", "data", "posts.json") // por si ejecutas desde otra capa
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // por defecto, devuelve el primer candidato (aunque no exista) para que el resto del código falle con mensaje claro
  return candidates[0];
}

// Simple escapador para inyectar texto en HTML/atributos
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper: cargar posts
function loadPosts() {
  const dataPath = resolvePostsPath();
  if (!fs.existsSync(dataPath)) {
    console.warn("posts.json no encontrado en ninguna ruta conocida. Buscado en:", dataPath);
    return [];
  }
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo/parsing data/posts.json:", err);
    return [];
  }
}

// Ruta del índice del blog
app.get("/blog", (req, res) => {
  const posts = loadPosts();

  // ordena por fecha descendente (maneja posts sin fecha)
  posts.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  // genera la lista de tags única
  const tagSet = new Set();
  posts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
  const tags = Array.from(tagSet);

  // Si no hay posts, mostramos mensaje informativo
  if (!posts.length) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Blog — Agente Astrológico</title></head><body><h1>Blog</h1><p>No se encontraron posts. Revisa data/posts.json</p></body></html>`);
  }

  // Construimos HTML (escapando los strings sensibles)
  const postsHtml = posts.map(p => {
    const safeTitle = escapeHtml((p.title || "").toLowerCase());
    const safeExcerpt = escapeHtml(p.excerpt || "");
    const safeCover = escapeHtml(p.coverImage || "/images/default-cover.jpg");
    const safeTags = p.tags || [];
    const readingMinutes = p.readingMinutes || Math.max(1, Math.round(((p.content || "").replace(/<[^>]+>/g, "").split(/\s+/).length) / 200));
    // data-tags como JSON (escapado)
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

  const tagsHtml = tags.map(t => `<button class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("\n");

  const html = `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Blog — Agente Astrológico</title>
    <meta name="description" content="Artículos Jyotish y astrología práctica.">
    <link rel="preload" href="/styles-blog.css" as="style">
    <link rel="stylesheet" href="/styles-blog.css">
    <style>

/* 🎨 Variables de color */
:root {
  --bg: #fafafa;
  --text: #222;
  --muted: #666;
  --accent: #5b5fc7;
  --card-bg: #fff;
  --border: #e5e5e5;
  --radius: 12px;
  --shadow: 0 2px 6px rgba(0,0,0,0.08);
  --max-width: 960px;
  --font: "Inter", system-ui, sans-serif;
}

/* 🔤 Reset mínimo */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}

/* 📰 Encabezado */
.blog-header {
  background: var(--accent);
  color: white;
  padding: 2rem 1rem;
  text-align: center;
}
.blog-header h1 {
  font-size: 2rem;
  font-weight: 800;
}
.blog-header .lead {
  font-size: 1.1rem;
  margin-top: 0.5rem;
  opacity: 0.9;
}

/* 📦 Contenedor */
.container {
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 1rem;
}

/* 🔍 Filtros */
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}
#searchInput {
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 1rem;
  width: 100%;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background: var(--border);
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}
.tag:hover {
  background: #dcdcdc;
}
.tag.active {
  background: var(--accent);
  color: white;
}

/* 📚 Grid de posts */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

/* 🎴 Card */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.2s;
}
.card:hover {
  transform: translateY(-4px);
}
.card-link {
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.card-media {
  height: 160px;
  background-size: cover;
  background-position: center;
}
.card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.card-body h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.meta {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.5rem;
}
.excerpt {
  flex: 1;
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
}
.card-tags {
  margin-top: auto;
}
.pill {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  margin-right: 0.3rem;
}

/* 📑 Paginación */
.pagination {
  margin: 2rem 0;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.pagination button {
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--border);
  transition: background 0.2s;
}
.pagination button:hover {
  background: #dcdcdc;
}
.pagination button.active {
  background: var(--accent);
  color: white;
}

/* 📌 Footer */
.site-footer {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 0.9rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  margin-top: 3rem;
}


    </style>
    
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
      // Client-side behavior: search, tag filter, simple pagination
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
          // pagination
          const total = filtered.length;
          const pages = Math.max(1, Math.ceil(total / postsPerPage));
          const start = (page-1)*postsPerPage;
          const end = start + postsPerPage;

          allCards.forEach(c => c.style.display = 'none');
          filtered.slice(start, end).forEach(c => c.style.display = '');

          // render pagination
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

        // events
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

        // initial render
        render(1);
      })();
    </script>
  </body>
  </html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Ruta dinámica del post (/blog/:id)
app.get("/blog/:id", (req, res) => {
  const id = req.params.id.toLowerCase();
  const posts = loadPosts();
  const post = posts.find(p => String(p.id || "").toLowerCase() === id);
  if (!post) {
    return res.status(404).send("<h2>Post no encontrado</h2><p><a href='/blog'>Volver al blog</a></p>");
  }

  // Construimos página del post (escapando donde hace falta)
  const safeCover = escapeHtml(post.coverImage || "/images/default-cover.jpg");
  const safeExcerpt = escapeHtml(post.excerpt || "");
  const safeTags = (post.tags || []).map(t => escapeHtml(t));

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(post.title)} — Agente Astrológico</title>
  <meta name="description" content="${escapeHtml(post.excerpt || '')}">
  <link rel="stylesheet" href="/styles-blog.css">
</head>
<body>
  <div class="page">
    <header class="post-header">
      <div class="brand-compact">
        <div class="logo">A</div>
        <div>
          <div style="font-weight:800">${escapeHtml(post.author || 'Agente Astrológico')}</div>
          <div class="post-meta">${post.date ? escapeHtml(new Date(post.date).toLocaleDateString()) : ""} • ${escapeHtml(String(post.readingMinutes || ""))} min</div>
        </div>
      </div>
      <div style="margin-left:auto">
        <a href="/blog" class="tag-pill" style="text-decoration:none">← Volver al blog</a>
      </div>
    </header>

    <div class="post-card">
      <div class="article-col">
        <div class="post-cover" style="background-image:url('${safeCover}')"></div>

        <div class="row-meta">
          ${(safeTags || []).map(t=>`<span class="tag-pill">${t}</span>`).join(' ')}
        </div>

        <article class="article-body">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="article-content">
            ${post.content || ""}
          </div>
          <div class="post-cta">
            <button class="btn" onclick="window.location.href='/contacto'">Pedir lectura</button>
            <button class="ghost" id="copyUrlBtn">Copiar URL</button>
          </div>
        </article>
      </div>

      <aside class="aside">
        <div class="card">
          <div style="font-weight:800">Sobre este tránsito</div>
          <p class="box" style="margin-top:10px">${safeExcerpt}</p>

          <div class="toc">
            <!-- TOC generado desde el contenido (opcional) -->
            <div style="font-weight:700;margin-top:10px">Contenido</div>
            <a href="#fechas">Fechas clave</a>
            <a href="#esencia">Esencia</a>
            <a href="#fortalezas">Fortalezas</a>
            <a href="#aprovechar">Cómo aprovecharlo</a>
          </div>

          <div style="margin-top:12px">
            <div style="font-weight:700">Compartir</div>
            <div class="share-btn">
              <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank')">Facebook</button>
              <button onclick="window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(document.title+' '+location.href),'_blank')">Twitter</button>
              <button onclick="window.open('mailto:?subject='+encodeURIComponent(document.title)+'&body='+encodeURIComponent(location.href))">Email</button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <footer style="margin-top:18px;color:var(--muted);display:flex;justify-content:space-between">
      <div>© ${new Date().getFullYear()} Agente Astrológico</div>
      <div style="color:var(--muted)">¿Quieres una lectura personalizada? <a href="/contacto" style="color:var(--accent)">Pide una sesión</a></div>
    </footer>
  </div>

  <script src="/post.js"></script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Mantener otras rutas existentes (ping, api, etc.) si las tienes
app.get("/ping", (req, res) => res.json({ message: "pong 🏓", status: "ok" }));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} - publicDir=${publicDir}`);
});

const fs = require('fs');
const path = require('path');

// --- Helpers ---
// Lee cartas.json desde disk en cada request (ver cambios sin reiniciar)
function loadCartas() {
  const file = path.join(__dirname, 'data', 'cartas.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.charts) ? data.charts : [];
  } catch (err) {
    console.error('Error leyendo data/cartas.json:', err.message);
    return [];
  }
}

// Escape básico para evitar XSS en strings simples
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Genera la tabla HTML de posiciones (retorna string)
function renderPositionsTable(positions) {
  if (!Array.isArray(positions) || !positions.length) {
    return '<p class="muted">No hay posiciones disponibles.</p>';
  }
  const rows = positions.map(p => {
    const label = escapeHtml(p.label || '');
    const lon = escapeHtml(p.longitude || '');
    const deg = typeof p.longitude_deg !== 'undefined' ? escapeHtml(p.longitude_deg) : '';
    const nak = escapeHtml(p.nakshatra || '');
    const pada = typeof p.pada !== 'undefined' ? escapeHtml(p.pada) : '';
    const rasi = escapeHtml(p.rasi || '');
    const nav = escapeHtml(p.navamsa || '');
    return `<tr>
      <td>${label}</td>
      <td>${lon}</td>
      <td>${deg}</td>
      <td>${nak}</td>
      <td>${pada}</td>
      <td>${rasi}</td>
      <td>${nav}</td>
    </tr>`;
  }).join('\n');

  return `<table class="positions">
    <thead>
      <tr><th>Label</th><th>Longitude</th><th>Deg</th><th>Nakshatra</th><th>Pada</th><th>Rasi</th><th>Navamsa</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

// Generador completo de la página HTML de una carta
function renderCartaPage(chart) {
  const title = escapeHtml(chart.person_name || 'Carta natal');
  const birth = chart.birth ? escapeHtml((chart.birth.date || '') + ' ' + (chart.birth.time || '') + ' ' + (chart.birth.timezone || '')) : '';
  const summary = escapeHtml(chart.summary || '');
  const positionsTable = renderPositionsTable(chart.positions || []);

  // Simple layout; adapta clases/estilos a tu CSS
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Carta natal</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    /* estilos mínimos para que se vea bien */
    body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:20px;color:#111;background:#f6f7fb}
    .container{max-width:900px;margin:0 auto;background:#fff;padding:18px;border-radius:10px;box-shadow:0 8px 30px rgba(17,24,39,.06)}
    .muted{color:#667}
    .positions{width:100%;border-collapse:collapse;margin-top:12px}
    .positions th,.positions td{padding:8px 10px;border-bottom:1px solid #eef2f7;text-align:left}
    a.back{display:inline-block;margin-bottom:12px}
  </style>
</head>
<body>
  <div class="container">
    <a class="back" href="/cartas">← Volver al listado de cartas</a>
    <h1>${title}</h1>
    <p class="muted">${birth}</p>
    <p>${summary}</p>

    <section>
      <h2>Posiciones</h2>
      ${positionsTable}
    </section>

    ${chart.notes && Object.keys(chart.notes||{}).length ? `<section><h3>Notas</h3><pre>${escapeHtml(JSON.stringify(chart.notes, null, 2))}</pre></section>` : ''}
  </div>
</body>
</html>`;
}

// --- RUTAS ---
// Opción A: ruta separada para cartas (recomendada)
app.get('/cartas', (req, res) => {
  const charts = loadCartas().map(c => ({
    id: c.id,
    person_name: c.person_name,
    summary: c.summary || '',
    positions_count: (c.positions || []).length,
    birth: c.birth || {}
  }));

  // Simple listado HTML
  const items = charts.map(ch => `<li><a href="/cartas/${encodeURIComponent(String(ch.id))}">${escapeHtml(ch.person_name)}</a> <span class="muted">(${ch.positions_count} posiciones)</span></li>`).join('');
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Listado de cartas</title>
<link rel="stylesheet" href="/public/styles.css"></head>
<body style="font-family:system-ui,Segoe UI,Roboto,Arial;background:#f6f7fb;padding:20px">
  <main style="max-width:900px;margin:0 auto">
    <h1>Cartas natales</h1>
    <ul>${items}</ul>
    <p><a href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`;
  res.send(html);
});

app.get('/cartas/:id', (req, res) => {
  const id = String(req.params.id || '').toLowerCase();
  const charts = loadCartas();
  const chart = charts.find(c => String(c.id || '').toLowerCase() === id);

  if (!chart) {
    return res.status(404).send(`<!doctype html><html><body><h2>Carta no encontrada</h2><p><a href="/cartas">Volver al listado</a></p></body></html>`);
  }

  const page = renderCartaPage(chart);
  res.send(page);
});

// --- Opción B: integrar en /blog/:id (si quieres que la misma ruta sirva posts o cartas) ---
// AÑADE esto junto a tu lógica actual en /blog/:id (reemplaza o combina según prefieras)
app.get('/blog/:id', (req, res, next) => {
  const id = req.params.id.toLowerCase();
  const posts = loadPosts(); // tu función existente
  const post = posts.find(p => String(p.id || '').toLowerCase() === id);

  if (post) {
    // tu lógica actual para renderizar post (manténla)
    const safeCover = escapeHtml(post.coverImage || "/images/default-cover.jpg");
    const safeExcerpt = escapeHtml(post.excerpt || "");
    const safeTags = (post.tags || []).map(t => escapeHtml(t));
    // ... genera y envía la página del post
    // por ejemplo: return res.send(renderPostHtml(post)); (mantén tu implementación)
    return renderYourExistingPostFlow(req, res, post); // <-- placeholder: conserva tu flujo actual
  }

  // Si no es un post, probamos entre las cartas
  const charts = loadCartas();
  const chart = charts.find(c => String(c.id || '').toLowerCase() === id);
  if (chart) {
    // enviar la página de carta (podría integrarse en la plantilla del blog)
    return res.send(renderCartaPage(chart));
  }

  // Si no es ni post ni carta, 404
  return res.status(404).send("<h2>Recurso no encontrado</h2><p><a href='/blog'>Volver al blog</a></p>");
});



