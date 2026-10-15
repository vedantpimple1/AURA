/**
 * KAI Aura — Universal API Client
 * Bridges Next.js frontend (Server Components, Server Actions, Client Components)
 * to the standalone Express backend via HTTP.
 */

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function getRequestHeaders(customHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(customHeaders);

  // If running in Node.js server context (Server Action / Server Component),
  // extract session cookie from incoming Next.js request and forward to backend
  if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('session')?.value;
      if (sessionToken && !headers.has('Cookie')) {
        headers.set('Cookie', `session=${sessionToken}`);
      }
    } catch {
      // In contexts where cookies() is not available, ignore
    }
  }

  return headers;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${baseUrl}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = await getRequestHeaders(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
      cache: options.cache || 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any = null;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.error || `Request failed with status ${response.status}`,
        code: responseData?.code || 'API_ERROR',
      };
    }

    // Backend responds in format: { success: true, data: ... }
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      return responseData;
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    console.error(`[API Client] Error requesting ${url}:`, error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to connect to backend server',
      code: 'NETWORK_ERROR',
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', params, ...options }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      ...options,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      ...options,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      ...options,
    }),

  delete: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
};
