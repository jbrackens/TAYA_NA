"use client";

export const dynamic = "force-dynamic";

import styled from "styled-components";
import { PunterProfile, AccountActions } from "../../../components/users";
import {
  ErrorBoundary,
  LoadingSpinner,
  ErrorState,
} from "../../../components/shared";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "../../../lib/admin-fetch";

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--t1, #1a1a1a);
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const NotesCard = styled.div`
  margin-top: 20px;
  background-color: var(--surface-1, #fff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
`;

const NotesTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
`;

const NoteItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid var(--border-1, #e5dfd2);
  font-size: 13px;
  color: var(--t1, #1a1a1a);

  &:last-child {
    border-bottom: none;
  }
`;

const NoteMeta = styled.div`
  margin-top: 4px;
  font-size: 11px;
  color: var(--t3, #8b8378);
`;

const EmptyNotes = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--t3, #8b8378);
`;

interface PunterProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  lastLoginDate: string;
  status: "active" | "suspended" | "inactive";
  balance: number;
  totalBets: number;
  pnl: number;
  verificationStatus: "verified" | "pending" | "failed";
}

interface PunterNote {
  id: number;
  category: string;
  content: string;
  authorId?: string;
  createdAt: string;
}

const toDisplayName = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;

const toUserStatus = (status: string): PunterProfileData["status"] => {
  if (status === "suspended") return "suspended";
  if (status === "active") return "active";
  return "inactive";
};

const mapPunter = (data: any): PunterProfileData => ({
  id: data.id,
  name: toDisplayName(data.email),
  email: data.email,
  avatar: toDisplayName(data.email)
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase(),
  createdAt: data.createdAt,
  lastLoginDate: data.lastLoginAt || "Never",
  status: toUserStatus(data.status),
  balance: 0,
  totalBets: 0,
  pnl: 0,
  verificationStatus: data.status === "active" ? "verified" : "pending",
});

function UserDetailPageContent() {
  const params = useParams();
  const punterId = params?.id as string;
  const [punter, setPunter] = useState<PunterProfileData | null>(null);
  const [notes, setNotes] = useState<PunterNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadPunter = async () => {
    const response = await adminFetch(`/api/v1/admin/punters/${punterId}/`);
    if (!response.ok) {
      throw new Error("Failed to load user");
    }
    const data = await response.json();
    setPunter(mapPunter(data));
  };

  const loadNotes = async () => {
    const response = await adminFetch(
      `/api/v1/admin/punters/${punterId}/notes`,
    );
    if (response.ok) {
      const data = await response.json();
      setNotes(Array.isArray(data?.items) ? data.items : []);
    }
  };

  useEffect(() => {
    const fetchPunter = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadPunter();
        await loadNotes();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPunter();
  }, [punterId]);

  const handleAction = async (
    action: string,
    data?: Record<string, unknown>,
  ) => {
    try {
      setIsUpdatingStatus(true);
      setError(null);

      switch (action) {
        case "suspend":
        case "activate": {
          const nextStatus = action === "suspend" ? "suspended" : "active";
          const response = await adminFetch(
            `/api/v1/admin/punters/${punterId}/status/`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: nextStatus }),
            },
          );
          if (!response.ok) throw new Error(`Failed to ${action} account`);
          const result = await response.json();
          setPunter(mapPunter(result));
          break;
        }
        case "resetPassword": {
          const response = await adminFetch(
            `/api/v1/admin/punters/${punterId}/reset-password`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );
          if (!response.ok) throw new Error("Failed to reset password");
          await response.json();
          break;
        }
        case "addNote": {
          const response = await adminFetch(
            `/api/v1/admin/punters/${punterId}/notes`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: data?.content || "Admin note",
                category: data?.category || "general",
              }),
            },
          );
          if (!response.ok) throw new Error("Failed to add note");
          break;
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Reload punter data after any mutation
      await loadPunter();
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRetry = () => {
    setPunter(null);
    setIsLoading(true);
    setError(null);
    loadPunter()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load user");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle>Loading...</PageTitle>
        <LoadingSpinner centered={true} text="Loading user details..." />
      </div>
    );
  }

  if (error || !punter) {
    return (
      <div>
        <PageTitle>Error</PageTitle>
        <ErrorState
          title="Failed to load user"
          message={error || "User not found"}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle>{punter.name}</PageTitle>

      <ContentGrid>
        <div>
          <PunterProfile
            punter={punter}
            onAction={handleAction}
            actionsAvailable={!isUpdatingStatus}
          />
        </div>

        <div style={{ height: "fit-content" }}>
          <AccountActions
            currentStatus={punter.status}
            onAction={handleAction}
          />
          <NotesCard>
            <NotesTitle>Admin Notes</NotesTitle>
            {notes.length === 0 ? (
              <EmptyNotes>No notes yet.</EmptyNotes>
            ) : (
              notes.map((note) => (
                <NoteItem key={note.id}>
                  {note.content}
                  <NoteMeta>
                    {note.category} ·{" "}
                    {new Date(note.createdAt).toLocaleString()}
                    {note.authorId ? ` · ${note.authorId}` : ""}
                  </NoteMeta>
                </NoteItem>
              ))
            )}
          </NotesCard>
        </div>
      </ContentGrid>
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <ErrorBoundary>
      <UserDetailPageContent />
    </ErrorBoundary>
  );
}
