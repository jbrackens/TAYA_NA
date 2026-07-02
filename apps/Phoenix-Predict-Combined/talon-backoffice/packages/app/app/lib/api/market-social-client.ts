import { apiClient } from "./client";

export interface MarketComment {
  id: string;
  marketId: string;
  parentId?: string;
  userId: string;
  body: string;
  reactionCount: number;
  reportCount: number;
  createdAt: string;
}

export interface PublicUserProfile {
  userId: string;
  displayName: string;
  commentCount: number;
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
  lastActiveAt?: string;
}

export interface SocialActivityItem {
  id: string;
  type:
    | "comment"
    | "follow"
    | "trade"
    | "settlement"
    | "reward"
    | "leaderboard";
  userId: string;
  targetId?: string;
  marketId?: string;
  commentId?: string;
  body?: string;
  createdAt: string;
}

interface MarketCommentsResponse {
  items: MarketComment[];
  total: number;
}

interface MarketCommentMutationResponse {
  comment: MarketComment;
}

interface PublicUserProfileResponse {
  profile: PublicUserProfile;
}

interface SocialActivityResponse {
  items: SocialActivityItem[];
  total: number;
}

export async function getMarketComments(
  marketId: string,
  limit = 50,
): Promise<MarketComment[]> {
  const raw = await apiClient.get<MarketCommentsResponse>(
    `/api/v1/social/markets/${marketId}/comments`,
    { limit: String(limit) },
  );
  return raw.items;
}

export async function createMarketComment(
  marketId: string,
  body: string,
  parentId?: string,
): Promise<MarketComment> {
  const raw = await apiClient.post<MarketCommentMutationResponse>(
    `/api/v1/social/markets/${marketId}/comments`,
    { body, parentId },
  );
  return raw.comment;
}

export async function reactToMarketComment(
  commentId: string,
): Promise<MarketComment> {
  const raw = await apiClient.post<MarketCommentMutationResponse>(
    `/api/v1/social/comments/${commentId}/react`,
  );
  return raw.comment;
}

export async function reportMarketComment(
  commentId: string,
  reason = "reported",
): Promise<MarketComment> {
  const raw = await apiClient.post<MarketCommentMutationResponse>(
    `/api/v1/social/comments/${commentId}/report`,
    { reason },
  );
  return raw.comment;
}

export async function getPublicUserProfile(
  userId: string,
): Promise<PublicUserProfile> {
  const raw = await apiClient.get<PublicUserProfileResponse>(
    `/api/v1/social/users/${encodeURIComponent(userId)}/profile`,
  );
  return raw.profile;
}

export async function followSocialUser(
  userId: string,
): Promise<PublicUserProfile> {
  const raw = await apiClient.post<PublicUserProfileResponse>(
    `/api/v1/social/users/${encodeURIComponent(userId)}/follow`,
  );
  return raw.profile;
}

export async function getUserActivity(
  userId: string,
  limit = 50,
): Promise<SocialActivityItem[]> {
  const raw = await apiClient.get<SocialActivityResponse>(
    `/api/v1/social/users/${encodeURIComponent(userId)}/activity`,
    { limit: String(limit) },
  );
  return raw.items;
}

export async function getGlobalActivity(
  limit = 50,
): Promise<SocialActivityItem[]> {
  const raw = await apiClient.get<SocialActivityResponse>(
    "/api/v1/social/activity",
    { limit: String(limit) },
  );
  return raw.items;
}
