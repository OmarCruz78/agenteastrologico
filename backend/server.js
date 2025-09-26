// backend/server.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// public dentro de backend/
const publicDir = path.join(__dirname, "public");
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
            <div class="card-tags">${(safeTags || []).map(t=>`<span class="pill">
