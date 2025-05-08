import express, { Request, Response } from "express";
import cors from "cors";
// Use native fetch in Node 18+

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Generic proxy endpoint
app.post("/proxy", async (req: Request, res: Response) => {
  const { url, method = "POST", headers = {}, body } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing or invalid 'url' in request body" });
    return;
  }
  console.log(`[PROXY] ${method} ${url}`);
  try {
    const apiRes = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await apiRes.text();
    res.status(apiRes.status);
    res.set(
      "Content-Type",
      apiRes.headers.get("content-type") || "application/json"
    );
    res.send(data);
  } catch (err: any) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
