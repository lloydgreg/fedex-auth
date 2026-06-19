export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
};

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host"
]);

function toBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function normalizeTarget(targetParam) {
  if (!targetParam) return null;
  const raw = Array.isArray(targetParam) ? targetParam[0] : targetParam;
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
}

function buildProxyHeaders(sourceHeaders) {
  const headers = {};
  for (const [key, value] of Object.entries(sourceHeaders)) {
    if (!value) continue;
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers[key] = value;
  }
  return headers;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const target = normalizeTarget(req.query.url);
  if (!target) {
    res.status(400).json({ error: "Missing target URL. Append ?url=https://apis-sandbox.fedex.com/..." });
    return;
  }

  let bodyBuffer = Buffer.alloc(0);
  if (req.method !== "GET" && req.method !== "HEAD") {
    bodyBuffer = await toBuffer(req);
  }

  const requestInit = {
    method: req.method,
    headers: buildProxyHeaders(req.headers)
  };

  if (bodyBuffer.length > 0) {
    requestInit.body = bodyBuffer;
  }

  let upstream;
  try {
    upstream = await fetch(target, requestInit);
  } catch (err) {
    res.status(502).json({ error: "Proxy request failed", details: err.message || String(err) });
    return;
  }

  for (const [key, value] of upstream.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  }

  res.status(upstream.status);

  if (upstream.status === 204 || upstream.status === 205) {
    res.end();
    return;
  }

  const arrayBuffer = await upstream.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
}
