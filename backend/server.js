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

