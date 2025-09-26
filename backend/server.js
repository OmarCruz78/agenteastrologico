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

// Ruta: índice del blog (/blog) — lista resumida con links
app.get("/blog", (req, res) => {
  const posts = loadPosts();
  const items = posts.map(p => {
    return `<article style="margin-bottom:1.1rem"><h3><a href="/blog/${p.id}" style="color:#0b6b3a;text-decoration:none">${p.title}</a></h3><p style="color:#555">${p.excerpt}</p></article>`;
  }).join("\n");

  const html = `
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Blog — Agente Astrológico</title>
    <style>
      body{font-family:Inter,Arial,Helvetica,sans-serif;background:#f7fafc;color:#111;padding:24px}
      a{color:#0b6b3a}
      .container{max-width:900px;margin:0 auto}
      header{margin-bottom:24px}
    </style>
  </head>
  <body>
    <div class="container">
      <header><h1>Blog — Agente Astrológico</h1><p>Artículos Jyotish sobre cada signo</p></header>
      ${items}
      <footer style="margin-top:48px;color:#666">© ${new Date().getFullYear()} Agente Astrológico</footer>
    </div>
  </body>
  </html>
  `;
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
