const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta pública (estática)
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Endpoint de prueba
app.get("/ping", (req, res) => {
  res.json({ message: "pong 🏓", status: "ok" });
});

// API ejemplo
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

app.get("/api/horoscope", (req, res) => {
  res.json({
    sign: "Aries",
    prediction: "Hoy es un buen día para empezar algo nuevo 🔮",
    date: new Date().toLocaleDateString(),
  });
});

// Rutas HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/blogpost", (req, res) => {
  res.sendFile(path.join(publicDir, "blogpost.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
