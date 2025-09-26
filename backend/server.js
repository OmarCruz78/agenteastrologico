// backend/server.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// public dentro de backend/
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Helper: cargar posts
function loadPosts() {
  const dataPath = path.join(__dirname, "..", "data", "posts.json"); // si data está en la raíz
  // Si data está dentro de backend/data cambia a: path.join(__dirname, "data", "posts.json")
  if (!fs.existsSync(dataPath)) return [];
  const raw = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(raw);
}

// Reemplaza tu handler app.get('/blog', ...) por este
app.get("/blog", (req, res) => {
  const posts = loadPosts(); // tu función que lee data/posts.json

  // ordena por fecha descendente
  posts.sort((a,b) => new Date(b.date) - new Date(a.date));

  // genera la lista de tags única
  const tagSet = new Set();
  posts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
  const tags = Array.from(tagSet);

  const html = `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Blog — Agente Astrológico</title>
    <meta name="description" content="Artículos Jyotish y astrología práctica.">
    <link rel="preload" href="/styles-blog.css" as="style">
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
          ${tags.map(t => `<button class="tag" data-tag="${t}">${t}</button>`).join("\n")}
        </div>
      </section>

      <section id="postsGrid" class="grid">
        ${posts.map(p => `
          <article class="card" data-tags='${JSON.stringify(p.tags||[])}' data-title="${(p.title||'').toLowerCase()}">
            <a class="card-link" href="/blog/${p.id}">
              <div class="card-media" style="background-image:url('${p.coverImage || '/images/default-cover.jpg'}')"></div>
              <div class="card-body">
                <h3>${p.title}</h3>
                <p class="meta">${new Date(p.date).toLocaleDateString()} • ${ (p.readingMinutes || Math.max(1, Math.round((p.content||'').replace(/<[^>]+>/g,'').split(' ').length / 200))) } min</p>
                <p class="excerpt">${p.excerpt}</p>
                <div class="card-tags">${(p.tags||[]).map(t=>`<span class="pill">${t}</span>`).join(' ')}</div>
              </div>
            </a>
          </article>
        `).join("\n")}
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

  res.send(html);
});

// Ruta dinámica del post (/blog/:id)
app.get("/blog/:id", (req, res) => {
  const id = req.params.id.toLowerCase();
  const posts = loadPosts();
  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).send("<h2>Post no encontrado</h2><p><a href='/blog'>Volver al blog</a></p>");
  }

  const html = `
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${post.title} — Agente Astrológico</title>
    <style>
      body{font-family:Inter,Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:20px}
      .container{max-width:900px;margin:0 auto}
      header{margin-bottom:12px}
      .meta{color:#6b7280;margin-bottom:18px}
      article p{line-height:1.7}
      a{color:#0b6b3a}
    </style>
  </head>
  <body>
    <div class="container">
      <header><a href="/blog">⬅ Volver</a><h1>${post.title}</h1></header>
      <div class="meta">Publicado • Agente Astrológico</div>
      <article>${post.content}</article>
      <footer style="margin-top:40px;color:#666">© ${new Date().getFullYear()} Agente Astrológico</footer>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// Mantener otras rutas existentes (ping, api, etc.) si las tienes
app.get("/ping", (req, res) => res.json({ message: "pong 🏓", status: "ok" }));

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
