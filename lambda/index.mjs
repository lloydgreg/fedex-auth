const SANDBOX_API_BASE_URL = process.env.FEDEX_SANDBOX_API_BASE_URL || "https://apis-sandbox.fedex.com";
const PRODUCTION_API_BASE_URL = process.env.FEDEX_PRODUCTION_API_BASE_URL || "https://apis.fedex.com";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding"
]);

const FEDEX_ROUTES = new Set([
  "/oauth/token",
  "/registration/v2/address/keysgeneration",
  "/registration/v2/invoice/keysgeneration",
  "/registration/v2/customerkeys/pingeneration",
  "/registration/v2/pin/keysgeneration"
]);

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-max-age": "86400"
  };
}

function response(statusCode, body, headers = {}, isBase64Encoded = false) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      ...headers
    },
    body,
    isBase64Encoded
  };
}

function json(statusCode, payload) {
  return response(statusCode, JSON.stringify(payload), {
    "content-type": "application/json; charset=utf-8"
  });
}

function getPath(event) {
  return event.rawPath || event.path || "/";
}

function getRequestBody(event) {
  if (!event.body) return Buffer.alloc(0);
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);
}

function upstreamRequestHeaders(headers = {}) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (key.toLowerCase() === "x-fedex-environment") continue;
    result[key] = value;
  }
  return result;
}

function upstreamHeaders(headers) {
  const result = {};
  headers.forEach((value, key) => {
    const header = key.toLowerCase();
    if (!HOP_BY_HOP.has(header)) {
      result[header] = value;
    }
  });
  return result;
}

function fedexBaseUrl(event) {
  const requestedEnvironment = (event.headers?.["x-fedex-environment"] || "").toLowerCase();
  return requestedEnvironment === "production"
    ? PRODUCTION_API_BASE_URL
    : SANDBOX_API_BASE_URL;
}

async function handleFedexRequest(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = getPath(event);
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const target = new URL(path + query, fedexBaseUrl(event)).toString();

  const body = getRequestBody(event);
  const requestInit = {
    method,
    headers: upstreamRequestHeaders(event.headers)
  };

  if (!["GET", "HEAD"].includes(method) && body.length > 0) {
    requestInit.body = body;
  }

  let upstream;
  try {
    upstream = await fetch(target, requestInit);
  } catch (err) {
    return json(502, { error: "FedEx request failed", details: err.message || String(err) });
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const payload = Buffer.from(arrayBuffer);

  return response(
    upstream.status,
    payload.toString("base64"),
    upstreamHeaders(upstream.headers),
    true
  );
}

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = getPath(event);

  if (method === "OPTIONS") {
    return response(204, "");
  }

  if (FEDEX_ROUTES.has(path)) {
    return handleFedexRequest(event);
  }

  return json(404, { error: "Not found" });
}
