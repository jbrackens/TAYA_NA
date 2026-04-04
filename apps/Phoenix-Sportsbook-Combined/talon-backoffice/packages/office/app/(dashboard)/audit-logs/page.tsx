'use client';

import styled from 'styled-components';
import { AuditLogTable } from '../components/audit';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../components/shared';
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
  resource: string;
  resourceId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  ipAddress: string;
}

const SAMPLE_LOGS: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-04-01T14:30:00Z',
    actor: 'admin@example.com',
    action: 'UPDATE',
    resource: 'fixture',
    resourceId: 'fix_001',
    before: { status: 'live', odds: 2.15 },
    after: { status: 'suspended', odds: 2.20 },
    ipAddress: '192.168.1.1',
  },
  {
    id: '2',
    timestamp: '2024-04-01T13:45:00Z',
    actor: 'risk_manager@example.com',
    action: 'CREATE',
    resource: 'alert',
    resourceId: 'alert_001',
    before: {},
    after: { severity: 'high', description: 'High liability detected' },
    ipAddress: '192.168.1.2',
  },
  {
    id: '3',
    timestamp: '2024-04-01T12:20:00Z',
    actor: 'admin@example.com',
    action: 'DELETE',
    resource: 'user',
    resourceId: 'user_123',
    before: { email: 'test@example.com', status: 'active' },
    after: {},
    ipAddress: '192.168.1.1',
  },
];

function AuditLogsPageContent() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        // Replace with actual API call:
        // const { get } = useAdminApi();
        // const data = await get('/api/admin/audit-logs');
        let filtered = [...SAMPLE_LOGS];

        if (searchTerm) {
          filtered = filtered.filter(
            log =>
              log.actor.includes(searchTerm) ||
              log.resource.includes(searchTerm) ||
              log.resourceId.includes(searchTerm)
          );
        }

        if (actionFilter) {
          filtered = filtered.filter(log => log.action === actionFilter);
        }

        if (resourceFilter) {
          filtered = filtered.filter(log => log.resource === resourceFilter);
        }

        setLogs(filtered);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, actionFilter, resourceFilter]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setLogs(SAMPLE_LOGS);
      setIsLoading(false);
    }, 300);
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
