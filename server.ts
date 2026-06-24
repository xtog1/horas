import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body parsing size limit to support base64 screenshots
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to retry transient API calls with exponential backoff safely within gateway timeouts
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    backoffFactor = 1.5,
    startTime = Date.now()
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isTransient =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("ResourceExhausted") ||
        errorMessage.includes("429") ||
        errorMessage.includes("Quota exceeded") ||
        errorMessage.includes("quota");

      const elapsed = Date.now() - startTime;
      if (!isTransient || retries <= 0 || elapsed > 38000) {
        throw error;
      }

      let currentDelay = delay;
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Quota exceeded") || errorMessage.includes("quota")) {
        // Find if there is a retry instruction like "Please retry in 36.33s"
        const match = errorMessage.match(/Please retry in ([\d\.]+)s/i);
        if (match && match[1]) {
          const seconds = parseFloat(match[1]);
          if (!isNaN(seconds)) {
            const neededMs = Math.ceil((seconds + 1.0) * 1000);
            if (neededMs + elapsed < 40000) {
              currentDelay = neededMs;
            } else {
              // Wait up to remaining time or max 8 seconds
              currentDelay = Math.min(8000, 40000 - elapsed - 2000);
            }
          } else {
            currentDelay = 4000;
          }
        } else {
          currentDelay = 4000; // default 4s for 429
        }
      }

      // Cap individual delays to 10 seconds to avoid timing out on the reverse proxy
      currentDelay = Math.max(500, Math.min(10000, currentDelay));

      // Check if waiting this delay will put us over the 40s threshold
      if (elapsed + currentDelay > 40000) {
        throw error;
      }

      console.warn(`[Gemini API] Error transitorio detectado (${errorMessage.slice(0, 150)}...). Reintentando en ${currentDelay}ms... Quedan ${retries} intentos.`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      
      const nextDelay = Math.min(10000, currentDelay * backoffFactor);
      return retryWithBackoff(fn, retries - 1, nextDelay, backoffFactor, startTime);
    }
  }

  // Lazy initializer for Gemini client to avoid crashes on startup if the key is not set yet
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY no configurada. Por favor, añádela en la sección Secrets.");
      }
      aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
  }

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure API endpoint for OCR scanning via Gemini 3.5 Flash
  app.post("/api/parse-parte", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Falta la imagen o el tipo de archivo." });
      }

      // Strip off the data URL prefix if it exists
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const ai = getAiClient();

      const prompt = `Analiza detenidamente la parte superior de esta captura de pantalla de un parte de trabajo de mi empresa.
CRÍTICO: Solo debes leer la parte de arriba (cabecera/resumen) para extraer la fecha, los pluses/píldoras de conceptos y el resumen de horas.
Ignora por completo el apartado de "Líneas del parte de trabajo" o listados detallados de filas que estén abajo; no son necesarios.

Sigue estrictamente estas reglas de extracción enfocadas en el formato exacto de las capturas de pantalla suministradas:

1. FECHA DEL PARTE ("date"):
   - Se encuentra en la parte superior derecha (debajo del título del parte, al lado de un texto como "Pendiente de revisión").
   - El formato en la imagen es español "DD/MM/YY" (por ejemplo, "04/06/26" representa el 4 de junio de 2026).
   - Debe convertirse y devolverse SIEMPRE en formato estándar "YYYY-MM-DD" (por ejemplo, "2026-06-04").
   - Presta mucha atención: NO confundas el día con el mes. "04/06/26" es 4 de junio, no 6 de abril. "07/06/26" es 7 de junio.

2. CÁLCULO DE HORAS A DECIMALES:
   - Las horas en la imagen se muestran en formato "XXh YYm" (por ejemplo: "05h 15m", "01h 00m", "05h 30m").
   - Debes convertir este formato a un número decimal para el JSON.
     * Ejemplo "05h 15m" -> 15 minutos son 15/60 = 0.25, por lo que el valor decimal es 5.25.
     * Ejemplo "05h 30m" -> 30 minutos son 30/60 = 0.5, por lo que el valor decimal es 5.5.
     * Ejemplo "01h 00m" -> 0 minutos son 0.0, por lo que el valor decimal es 1.0.

3. MAPEO DE HORAS (BAJO EL APARTADO "Resumen de horas"):
   - IGNORE COMPLETAMENTE el campo "Horas normales" (es la jornada ordinaria básica y no nos interesa para horas extras).
   - "hoursNormal" (Horas extras normales):
     * Si dice "Horas extraordinarias" o "Hora extraordinaria", extrae su valor (ej. "05h 15m" -> 5.25) y asígnalo a "hoursNormal".
   - "hoursFestive" (Horas extras festivas):
     * Suma los valores de las filas del resumen de horas que contengan cualquiera de estos términos:
       - "Horas nocturnas" / "Hora nocturna"
       - "Horas fin de semana" / "Hora fin de semana"
       - "Horas festivas" / "Hora festiva"
       - "Horas festivas fin de semana" / "Hora festiva fin de semana"
       - "Horas festivas nocturnas" / "Hora festiva nocturna"
       - "Horas festivas nocturnas fin de semana" / "Hora festiva nocturna fin de semana"
     * Suma todos estos conceptos si aparecen bajo "Resumen de horas" y asígnalos a "hoursFestive".

4. PLUSES Y BADGES (Píldoras de fondo gris con bordes redondeados en la parte superior, arriba de "Resumen de horas"):
   - "hasReten":
     * Busca píldoras con textos como "Retén (26GI0029)" o que mencionen "Retén", "reten" o el código "26gi0029". Si existe, ponlo a true. De lo contrario, false.
   - "hasMediaDieta":
     * Busca píldoras con textos como "Media dieta (1 imágen/es adjuntas)", "Media dieta" o "mediadieta". Si existe, ponlo a true. De lo contrario, false.
   - "hasReclutamiento":
     * Busca píldoras que digan "Reclutamiento" o similar. Si existe, ponlo a true. De lo contrario, false.

5. NOTAS ("notes"):
   - Escribe un resumen breve en español indicando qué conceptos específicos has encontrado (ej. "Extracción de cabecera: Fecha 2026-06-04. Detectadas 5.25h extraordinarias (normales) y 1.0h nocturnas (festivas). Marcado Retén y Media dieta.").

Devuelve estrictamente un objeto JSON válido con este esquema de salida, sin bloques de código markdown ni texto adicional:
{
  "date": "YYYY-MM-DD",
  "hoursNormal": 0.0,
  "hoursFestive": 0.0,
  "hasReten": false,
  "hasMediaDieta": false,
  "hasReclutamiento": false,
  "notes": "..."
}`;

      const response = await retryWithBackoff(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        })
      );

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("El modelo Gemini no devolvió ningún contenido.");
      }

      const extractedData = JSON.parse(textOutput);
      return res.json({ success: true, data: extractedData });
    } catch (error: any) {
      console.error("Error procesando imagen con Gemini:", error);
      return res.status(500).json({
        error: "Error al procesar el parte con Inteligencia Artificial.",
        details: error?.message || String(error),
      });
    }
  });

  // Integration of Vite middleware for dev or serving static build for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado en el puerto ${PORT} (Entorno: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer().catch((error) => {
  console.error("Error al iniciar el servidor Express:", error);
});
