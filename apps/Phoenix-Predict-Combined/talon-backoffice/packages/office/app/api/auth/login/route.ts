/**
 * Next.js API Route - Backoffice Auth Login Proxy
 * Proxies login requests to Go backend
 */

import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username =
      typeof body?.username === 'string'
        ? body.username
        : typeof body?.email === 'string'
          ? body.email
          : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:18081';

    if (!username || !password) {
      return NextResponse.json(
        { message: 'username and password are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData || { message: response.statusText }, { status: response.status });
    }

    const data = await response.json();

    // Set auth tokens in httpOnly cookies for security
    // authToken: used by the backoffice Next.js middleware
    // access_token: used by the Go gateway auth middleware (forwarded via rewrite)
    const res = NextResponse.json(data);
    if (data.accessToken) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: data.expiresInSeconds || 3600,
      };
      res.cookies.set({ name: 'authToken', value: data.accessToken, ...cookieOptions });
      res.cookies.set({ name: 'access_token', value: data.accessToken, ...cookieOptions, path: '/' });

      // csrf_token: the gateway's httpx.CSRF enforces a double-submit pair
      // (cookie === X-CSRF-Token header, constant-time, no server-side
      // secret) on every state-changing admin call. Nothing in the stack
      // minted this cookie, so create/lifecycle/settle all 403'd. It must
      // NOT be httpOnly — the shared api-client reads it from
      // document.cookie to populate the header. Security holds because the
      // same-origin policy prevents a cross-origin attacker from reading
      // the cookie or the response to forge the header. Same value the
      // browser sends as the cookie (forwarded to :18080 via the
      // next.config rewrite in dev / Caddy in prod, both same-origin).
      res.cookies.set({
        name: 'csrf_token',
        value: randomBytes(32).toString('hex'),
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: data.expiresInSeconds || 3600,
      });
    }

    return res;
  } catch (error) {
    console.error('[API] Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
