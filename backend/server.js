const express = require("express");

const app = express();
const port = 3000; // puedes cambiarlo si ya usas ese puerto

// Endpoint de prueba
app.get("/ping", (req, res) => {
  res.json({ message: "pong 🏓", status: "ok" });
});

//app get
app.get("/", (req, res) => {
  res.send("🚀 Servidor funcionando en Render");
});

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});



// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});


app.get("/api/horoscope", (req, res) => {
  res.json({
    sign: "Aries",
    prediction: "Hoy es un buen día para empezar algo nuevo 🔮",
    date: new Date().toLocaleDateString()
    });
});


import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Necesario para rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta pública (donde estará el blog.html)
app.use(express.static(path.join(__dirname, "public")));

// Ruta de inicio (tu landing)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta del blog
app.get("/blog", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blog.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});






