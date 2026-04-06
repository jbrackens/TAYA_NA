'use client';

import styled from 'styled-components';
import { AuditLogTable } from '../../components/audit';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../../components/shared';
import { useState, useEffect } from 'react';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FilterInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px 16px;
  background-color: #0f3460;
  border: 1px solid #0f3460;
  color: #ffffff;
  border-radius: 4px;
  font-size: 14px;

  &::placeholder {
    color: #a0a0a0;
  }

  &:focus {
    outline: none;
    border-color: #4a7eff;
  }
`;

const FilterSelect = styled.select`
  padding: 10px 16px;
  background-color: #0f3460;
  border: 1px solid #0f3460;
  color: #ffffff;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #4a7eff;
  }

  option {
    background-color: #16213e;
    color: #ffffff;
  }
`;

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
}

const deriveEntityType = (action: string, targetId: string) => {
  if (targetId.startsWith('p:')) return 'user';
  if (targetId.startsWith('m:')) return 'market';
  if (targetId.startsWith('f:')) return 'fixture';
  if (action.includes('.')) return action.split('.')[0];
  return 'system';
};

const deriveActionLabel = (action: string) => {
  if (action.includes('.')) {
    return action.split('.').slice(1).join('.').toUpperCase();
  }
  return action.toUpperCase();
};

function AuditLogsPageContent() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/v1/admin/audit-logs?page=1&pageSize=100', {
          headers: {
            'X-Admin-Role': 'admin',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to load audit logs');
        }
        const data = await response.json();
        let items = (Array.isArray(data?.items) ? data.items : []).map((item: any) => {
          const entityType = deriveEntityType(item.action || '', item.targetId || '');
          return {
            id: item.id,
            timestamp: item.occurredAt,
            actor: item.actorId,
            action: deriveActionLabel(item.action || ''),
            entityType,
            entityId: item.targetId || 'system',
            dataAfter: item.details ? { details: item.details } : undefined,
          } as AuditLogEntry;
        });

        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          items = items.filter(
            (log) =>
              log.actor.toLowerCase().includes(search) ||
              log.entityType.toLowerCase().includes(search) ||
              log.entityId.toLowerCase().includes(search),
          );
        }

        if (actionFilter) {
          items = items.filter((log) => log.action === actionFilter);
        }

        if (resourceFilter) {
          items = items.filter((log) => log.entityType === resourceFilter);
        }

        setLogs(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [searchTerm, actionFilter, resourceFilter, reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    setReloadKey((value) => value + 1);
  };

  return (
    <div>
      <PageTitle>Audit Logs</PageTitle>

      <FilterBar>
        <FilterInput
          type="text"
          placeholder="Search by resource or admin..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <FilterSelect value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </FilterSelect>

        <FilterSelect value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}>
          <option value="">All Resources</option>
          <option value="user">User</option>
          <option value="fixture">Fixture</option>
          <option value="market">Market</option>
          <option value="odds">Odds</option>
          <option value="alert">Alert</option>
        </FilterSelect>
      </FilterBar>

      {error ? (
        <ErrorState
          title="Failed to load audit logs"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      ) : (
        <AuditLogTable logs={logs} isLoading={isLoading} />
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ErrorBoundary>
      <AuditLogsPageContent />
    </ErrorBoundary>
  );
}
