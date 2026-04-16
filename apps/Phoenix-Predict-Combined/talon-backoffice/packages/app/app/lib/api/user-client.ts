import { apiClient } from './client';

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

// Request types
export interface UpdateProfileRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface UpdatePreferencesRequest {
  notification_email?: boolean;
  notification_sms?: boolean;
  notification_push?: boolean;
  marketing_email?: boolean;
  currency?: string;
}

// Response types (Go API uses snake_case)
interface UserProfileRaw {
  user_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  kyc_status: string;
  created_at: string;
  updated_at: string;
}

interface PreferencesRaw {
  user_id: string;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  marketing_email: boolean;
  currency: string;
  updated_at: string;
}

interface DeleteAccountResponseRaw {
  user_id: string;
  status: string;
  scheduled_deletion_date?: string;
}

// Normalized response types (camelCase)
export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Preferences {
  userId: string;
  notificationEmail: boolean;
  notificationSms: boolean;
  notificationPush: boolean;
  marketingEmail: boolean;
  currency: string;
  updatedAt: string;
}

export interface DeleteAccountResponse {
  userId: string;
  status: string;
  scheduledDeletionDate?: string;
}

const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<
  string,
  {
    entry: TimedCacheEntry<UserProfile> | null;
    promise: Promise<UserProfile> | null;
  }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      acc[camelKey] = typeof value === 'object' && value !== null
        ? normalizeSnakeCase(value as Record<string, unknown>)
        : value;
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const cached = profileCache.get(userId);
  if (cached && isFresh(cached.entry, PROFILE_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    const raw = await apiClient.get<UserProfileRaw>(`/api/v1/users/${userId}/profile`);
    const result = normalizeSnakeCase(raw) as UserProfile;
    profileCache.set(userId, {
      entry: { data: result, ts: Date.now() },
      promise: null,
    });
    return result;
  })();

  profileCache.set(userId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  request: UpdateProfileRequest
): Promise<UserProfile> {
  const raw = await apiClient.put<UserProfileRaw>(`/api/v1/users/${userId}/profile`, request);
  return normalizeSnakeCase(raw);
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  userId: string,
  request: UpdatePreferencesRequest
): Promise<Preferences> {
  const raw = await apiClient.put<PreferencesRaw>(
    `/api/v1/users/${userId}/profile/preferences`,
    request
  );
  return normalizeSnakeCase(raw);
}

/**
 * Delete account (schedules deletion)
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResponse> {
  const raw = await apiClient.post<DeleteAccountResponseRaw>('/api/v1/punters/delete', {
    user_id: userId
  });
  return normalizeSnakeCase(raw);
}
