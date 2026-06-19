import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 8010;
const MAX_BODY = process.env.MAX_BODY || "10mb";
const SANDBOX_API_BASE_URL = process.env.FEDEX_SANDBOX_API_BASE_URL || "https://apis-sandbox.fedex.com";
const PRODUCTION_API_BASE_URL = process.env.FEDEX_PRODUCTION_API_BASE_URL || "https://apis.fedex.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_ROOT = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : process.cwd();

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

const FEDEX_ROUTES = [
  "/oauth/token",
  "/registration/v2/address/keysgeneration",
  "/registration/v2/invoice/keysgeneration",
  "/registration/v2/customerkeys/pingeneration",
  "/registration/v2/pin/keysgeneration"
];

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", req.header("Access-Control-Request-Headers") || "*");
  res.setHeader("Access-Control-Max-Age", "86400");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.options("*", (req, res) => res.sendStatus(204));

app.use(FEDEX_ROUTES, express.raw({ type: "*/*", limit: MAX_BODY }));
app.use(express.static(STATIC_ROOT));

app.get("/", (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, "fedex-ship-auth.html"));
});

function fedexBaseUrl(req) {
  return String(req.header("x-fedex-environment") || "").toLowerCase() === "production"
    ? PRODUCTION_API_BASE_URL
    : SANDBOX_API_BASE_URL;
}

function upstreamRequestHeaders(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (!value) continue;
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (key.toLowerCase() === "x-fedex-environment") continue;
    result[key] = value;
  }
  return result;
}

app.all(FEDEX_ROUTES, async (req, res) => {
  const target = new URL(req.originalUrl, fedexBaseUrl(req)).toString();
  const requestInit = {
    method: req.method,
    headers: upstreamRequestHeaders(req.headers)
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.body && req.body.length > 0) {
    requestInit.body = req.body;
  }

  try {
    const upstream = await fetch(target, requestInit);

    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.removeHeader("content-length");
    res.removeHeader("content-encoding");

    res.status(upstream.status);

    if (upstream.status === 204 || upstream.status === 205) {
      res.end();
      return;
    }

    const stream = upstream.body;
    if (stream && typeof stream.pipe === "function") {
      stream.pipe(res);
    } else {
      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    res.status(502).json({ error: "FedEx request failed", details: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`FedEx auth helper listening on http://localhost:${PORT}`);
  console.log(`Serving static files from ${STATIC_ROOT}`);
  console.log(`FedEx server-side routes available at http://localhost:${PORT}/oauth/token and /registration/v2/...`);
});
