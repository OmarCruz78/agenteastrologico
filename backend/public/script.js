import OpenAI from 'https://cdn.jsdelivr.net/npm/openai@latest/dist/openai.min.js';
import jyotish from 'https://cdn.jsdelivr.net/npm/jyotish-calculations@latest/dist/jyotish.min.js';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: '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', // Mejor usar backend para seguridad
});

// Función para generar la interpretación astrológica
async function generarInterpretacion(fechaHoraISO, lugar) {
  try {
    const fecha = new Date(fechaHoraISO);

    // Calcular posiciones planetarias
    const posiciones = jyotish.grahas.calculatePositions(fecha, lugar);

    // Obtener Nakshatra de la Luna
    const nakshatraLuna = jyotish.nakshatras.getNakshatraForPosition(posiciones.moon.longitude);

    // Crear prompt para GPT
    const prompt = `
Eres un astrólogo experto en Jyotish.
Interpreta la siguiente carta natal:
Fecha y hora: ${fecha.toLocaleString()}
Lugar: ${lugar}
Posiciones planetarias: ${JSON.stringify(posiciones, null, 2)}
Nakshatra de la Luna: ${nakshatraLuna}

Proporciona un análisis detallado sobre personalidad, emociones, liderazgo, talentos y posibles desafíos.
Hazlo claro y amigable.
`;

    // Llamada a OpenAI
    const respuesta = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    return respuesta.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return 'Error al generar la interpretación. Revisa la consola.';
  }
}

// Evento del botón
document.getElementById('generar').addEventListener('click', async () => {
  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const lugar = document.getElementById('lugar').value;
  console.log("Hello, world!");

  if (!fecha || !hora || !lugar) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  // Combinar fecha y hora en formato ISO
  const fechaHoraISO = `${fecha}T${hora}:00`;

  const resultadoDiv = document.getElementById('resultado');
  resultadoDiv.textContent = 'Generando interpretación...';

  const interpretacion = await generarInterpretacion(fechaHoraISO, lugar);
  resultadoDiv.textContent = interpretacion;
});
