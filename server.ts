import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to proxy RapidAPI requests to bypass CORS
  app.post("/api/verify-gstin", async (req, res) => {
    const { gstin } = req.body;
    
    // In production/deployment, use environment variables.
    // Fallback to request body for testing/flexibility, but prefer env.
    const key = process.env.RAPIDAPI_KEY || req.body.key;
    const host = process.env.RAPIDAPI_HOST || req.body.host || 'gst-verification.p.rapidapi.com';

    if (!key) {
      return res.status(500).json({ error: "RAPIDAPI_KEY environment variable is not configured in Settings > Secrets." });
    }

    if (!host) {
      return res.status(500).json({ error: "RAPIDAPI_HOST environment variable is not configured in Settings > Secrets." });
    }

    if (!gstin) {
      return res.status(400).json({ error: "Missing gstin in request body" });
    }

    try {
      // Common path pattern for GSTIN APIs, adjust if the specific API differs
      // e.g., gst-return-status.p.rapidapi.com uses /gstin/{gstin}
      // Indian GST API might use /v1/gstin/{gstin}
      
      const endpointPath = '/v3/tasks/sync/verify_with_source/ind_gst_certificate';
      
      // We generate random UUIDs for the task_id and group_id
      const taskId = crypto.randomUUID();
      const groupId = crypto.randomUUID();

      const response = await fetch(`https://${host}${endpointPath}`, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': key,
          'x-rapidapi-host': host,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: taskId,
          group_id: groupId,
          data: {
            gstin: gstin
          }
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(response.status || 500).json({ 
          error: `API returned an invalid or non-JSON response (Status: ${response.status})`,
          details: text.substring(0, 200) 
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || data.error || "RapidAPI request failed", details: data });
      }

      res.json(data);
    } catch (err: any) {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Failed to connect to RapidAPI: " + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
