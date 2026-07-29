import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SANDBOX_API_BASE_URL = process.env.FEDEX_SANDBOX_API_BASE_URL || "https://apis-sandbox.fedex.com";
const PRODUCTION_API_BASE_URL = process.env.FEDEX_PRODUCTION_API_BASE_URL || "https://apis.fedex.com";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_ROOT = path.join(__dirname, "static");

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

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/vnd.microsoft.icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

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

function isTextAsset(contentType) {
  return contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("svg");
}

function staticHeaders(contentType, cacheControl) {
  return {
    "content-type": contentType,
    "cache-control": cacheControl
  };
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

function staticFileForPath(requestPath) {
  const cleanPath = requestPath === "/" || requestPath === ""
    ? "/index.html"
    : requestPath;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(cleanPath);
  } catch {
    return null;
  }
  const relativePath = decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(STATIC_ROOT, relativePath);
  if (!filePath.startsWith(STATIC_ROOT + path.sep)) return null;
  return filePath;
}

async function handleRuntimeConfig() {
  return json(200, { apiBaseUrl: "" });
}

async function handleStaticAsset(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const requestPath = getPath(event);
  const filePath = staticFileForPath(requestPath);
  if (!filePath) {
    return json(400, { error: "Invalid asset path" });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";

  let asset;
  try {
    asset = await readFile(filePath);
  } catch (err) {
    return json(err.code === "ENOENT" ? 404 : 500, {
      error: err.code === "ENOENT" ? "Asset not found" : "Asset could not be read"
    });
  }

  if (method === "HEAD") {
    return response(200, "", staticHeaders(contentType, cacheControl));
  }

  if (isTextAsset(contentType)) {
    return response(200, asset.toString("utf8"), staticHeaders(contentType, cacheControl));
  }

  return response(
    200,
    asset.toString("base64"),
    staticHeaders(contentType, cacheControl),
    true
  );
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

  if (method === "GET" || method === "HEAD") {
    if (path === "/runtime-config.json") {
      return handleRuntimeConfig();
    }
    return handleStaticAsset(event);
  }

  return json(404, { error: "Not found" });
}
