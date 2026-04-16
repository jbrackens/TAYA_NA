/**
 * Next.js API Route - Backoffice Fixtures Proxy
 * Proxies fixture requests to Go backend for server-side rendering
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
    const authToken = request.cookies.get('authToken')?.value;

    // Build query string
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/v1/fixtures?${queryString}` : '/api/v1/fixtures';

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authorization if token exists
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData || { message: response.statusText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Fixtures error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
