/**
 * Next.js API Route - Backoffice Auth Login Proxy
 * Proxies login requests to Go backend
 */

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

    // Set auth token in httpOnly cookie for security
    const res = NextResponse.json(data);
    if (data.accessToken) {
      res.cookies.set({
        name: 'authToken',
        value: data.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
