// Bus ETA Worker — combined static (dist/) + API + D1
// Migrated from Express + sql.js to Cloudflare Workers
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { routesData } from './routes-data.js';
import { routeShapeMap } from './route-shape-map.js';

const JWT_SECRET = new TextEncoder().encode('bus-eta-secret-key-2024');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function error(msg, status = 500) {
  return json({ error: msg }, status);
}

async function getBody(request) {
  try { return await request.json(); } catch { return null; }
}

async function createToken(userId, email) {
  return await new SignJWT({ id: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

async function getAuth(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(header.split(' ')[1], JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ===== Static assets =====
async function serveAsset(env, request) {
  const resp = await env.ASSETS.fetch(request);
  if (resp.status === 404) {
    // SPA fallback: serve index.html for non-API routes
    const idx = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    return idx;
  }
  return resp;
}

// ===== Main handler =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const db = env.DB;

    // ---- Auth ----
    if (path === '/api/login' && request.method === 'POST') {
      const body = await getBody(request);
      if (!body || !body.email || !body.password) return error('Email and password required', 400);
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(body.email).first();
      if (!user) return error('Invalid email or password', 401);
      const valid = bcrypt.compareSync(body.password, user.password);
      if (!valid) return error('Invalid email or password', 401);
      const token = await createToken(user.id, user.email);
      return json({ token, user: { id: user.id, email: user.email } });
    }

    if (path === '/api/register' && request.method === 'POST') {
      const body = await getBody(request);
      if (!body || !body.email || !body.password) return error('Email and password required', 400);
      const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
      if (existing) return error('Email already registered', 400);
      const hashed = bcrypt.hashSync(body.password, 10);
      const result = await db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').bind(body.email, hashed).run();
      const id = result.meta.last_row_id;
      const token = await createToken(id, body.email);
      return json({ token, user: { id, email: body.email } });
    }

    if (path === '/api/auth/register' && request.method === 'POST') {
      const body = await getBody(request);
      if (!body || !body.email || !body.password) return error('Email and password required', 400);
      const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
      if (existing) return error('Email already registered', 400);
      const hashed = bcrypt.hashSync(body.password, 10);
      const result = await db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').bind(body.email, hashed).run();
      const id = result.meta.last_row_id;
      const token = await createToken(id, body.email);
      return json({ token, user: { id, email: body.email } });
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      const body = await getBody(request);
      if (!body || !body.email || !body.password) return error('Email and password required', 400);
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(body.email).first();
      if (!user) return error('Invalid email or password', 401);
      const valid = bcrypt.compareSync(body.password, user.password);
      if (!valid) return error('Invalid email or password', 401);
      const token = await createToken(user.id, user.email);
      return json({ token, user: { id: user.id, email: user.email } });
    }

    if (path === '/api/me') {
      const auth = await getAuth(request);
      if (!auth) return error('Unauthorized', 401);
      return json({ id: auth.id, email: auth.email });
    }

    // ---- Favorites ----
    if (path === '/api/favorites' && request.method === 'GET') {
      const auth = await getAuth(request);
      if (!auth) return error('Unauthorized', 401);
      const favorites = await db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY id DESC').bind(auth.id).all();
      return json(favorites.results);
    }

    if (path === '/api/favorites' && request.method === 'POST') {
      const auth = await getAuth(request);
      if (!auth) return error('Unauthorized', 401);
      const body = await getBody(request);
      if (!body || !body.route || !body.direction || !body.stop) {
        return error('route, direction, and stop required', 400);
      }
      const result = await db.prepare(
        'INSERT OR IGNORE INTO favorites (user_id, route, direction, stop, route_name, stop_name) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(auth.id, body.route, body.direction, body.stop, body.route_name || '', body.stop_name || '').run();
      return json({ id: result.meta.last_row_id, success: true });
    }

    if (path.startsWith('/api/favorites/') && request.method === 'DELETE') {
      const auth = await getAuth(request);
      if (!auth) return error('Unauthorized', 401);
      const id = path.split('/').pop();
      await db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').bind(id, auth.id).run();
      return json({ success: true });
    }

    if (path === '/api/favorites/sync' && request.method === 'POST') {
      const auth = await getAuth(request);
      if (!auth) return error('Unauthorized', 401);
      const body = await getBody(request);
      if (!body || !Array.isArray(body.favorites)) return error('favorites array required', 400);
      const stmt = db.prepare('INSERT OR IGNORE INTO favorites (user_id, route, direction, stop, route_name, stop_name) VALUES (?, ?, ?, ?, ?, ?)');
      for (const fav of body.favorites) {
        if (fav._delete) {
          if (fav.id) await db.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?').bind(fav.id, auth.id).run();
        } else {
          await stmt.bind(auth.id, fav.route, fav.direction, fav.stop, fav.route_name || '', fav.stop_name || '').run();
        }
      }
      const updated = await db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY id DESC').bind(auth.id).all();
      return json({ favorites: updated.results });
    }

    // ---- Routes ----
    if (path === '/api/routes') {
      const q = url.searchParams.get('q');
      if (!q) {
        return json(Object.entries(routesData).map(([route, data]) => ({ route, ...data })));
      }
      const query = q.toLowerCase();
      const results = Object.entries(routesData)
        .filter(([route, data]) =>
          route.toLowerCase().includes(query) ||
          data.orig.toLowerCase().includes(query) ||
          data.dest.toLowerCase().includes(query)
        )
        .map(([route, data]) => ({ route, ...data }));
      return json(results);
    }

    const routeMatch = path.match(/^\/api\/routes\/([^/]+)(?:\/stops)?$/);
    if (routeMatch) {
      const route = decodeURIComponent(routeMatch[1]);
      const data = routesData[route];
      if (!data) return error('Route not found', 404);
      if (path.endsWith('/stops')) {
        const stops = [
          { id: `${route}_1`, name: `${data.orig}`, seq: 1 },
          { id: `${route}_2`, name: `${data.orig} 附近`, seq: 2 },
          { id: `${route}_3`, name: `${data.dest} 附近`, seq: 3 },
          { id: `${route}_4`, name: `${data.dest}`, seq: 4 },
        ];
        return json(stops);
      }
      return json({ route, ...data });
    }

    // ---- ETA (mock) ----
    const etaMatch = path.match(/^\/api\/eta\/([^/]+)\/([^/]+)$/);
    if (etaMatch) {
      const route = decodeURIComponent(etaMatch[1]);
      if (!routesData[route]) return error('Route not found', 404);
      const now = new Date();
      const etas = [
        { eta: new Date(now.getTime() + 5 * 60000).toISOString(), remark: '預計 5 分鐘' },
        { eta: new Date(now.getTime() + 12 * 60000).toISOString(), remark: '預計 12 分鐘' },
        { eta: new Date(now.getTime() + 20 * 60000).toISOString(), remark: '預計 20 分鐘' },
      ];
      return json(etas);
    }

    // ---- Proxy (CTB / KMB static data) ----
    const CTB_STATIC = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb';
    const KMB_STATIC = 'https://winstonma.github.io/MMM-HK-Transport-ETA-Data/kmb';
    const WAYPOINTS_BASE = 'https://hkbus.github.io/route-waypoints/';

// Route shape: look up hkbus route-waypoints GeoJSON (daily synced from CSDI)
async function fetchRouteShape(company, route, bound) {
  const key = `${String(company).toUpperCase()}|${String(route).toUpperCase()}|${String(bound).toUpperCase()}`;
  const file = routeShapeMap[key];
  if (!file) return { coordinates: [] };
  try {
    const resp = await fetch(`${WAYPOINTS_BASE}${file}`);
    if (!resp.ok) return { coordinates: [] };
    const geojson = await resp.json();
    const coords = [];
    const features = geojson.features || [];
    const pushPoint = (lat, lng) => {
      const last = coords[coords.length - 1];
      if (!last || last[0] !== lat || last[1] !== lng) {
        coords.push([lat, lng]);
      }
    };
    for (const f of features) {
      const geom = f.geometry;
      if (!geom || !geom.coordinates) continue;
      if (geom.type === 'MultiLineString') {
        for (const line of geom.coordinates) {
          for (const [lng, lat] of line) pushPoint(lat, lng);
        }
      } else if (geom.type === 'LineString') {
        for (const [lng, lat] of geom.coordinates) pushPoint(lat, lng);
      }
    }
    return { coordinates: coords };
  } catch {
    return { coordinates: [] };
  }
}

    if (path.startsWith('/api/proxy/ctb/')) {
      const subpath = path.replace('/api/proxy/ctb/', '');
      const resp = await fetch(`${CTB_STATIC}/${subpath}`);
      if (!resp.ok) return error(`CTB proxy: HTTP ${resp.status}`, resp.status);
      return new Response(await resp.text(), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (path.startsWith('/api/proxy/kmb/')) {
      const subpath = path.replace('/api/proxy/kmb/', '');
      const resp = await fetch(`${KMB_STATIC}/${subpath}`);
      if (!resp.ok) return error(`KMB proxy: HTTP ${resp.status}`, resp.status);
      return new Response(await resp.text(), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // ---- Route shape (real waypoints from hkbus route-waypoints) ----
    if (path.startsWith('/api/route-shape/')) {
      const parts = path.replace('/api/route-shape/', '').split('/');
      if (parts.length >= 3) {
        const [company, route, bound] = parts;
        return json(await fetchRouteShape(company, route, bound));
      }
      return json({ coordinates: [] });
    }

    // ---- Fallback: 404 for unknown API ----
    if (path.startsWith('/api/')) {
      return error('Not found', 404);
    }

    // ---- Static assets (dist/) ----
    return serveAsset(env, request);
  }
};
