"use client";

import styled from "styled-components";
import { Badge } from "../shared";
import { useState } from "react";
import { DataTable, ColumnDef } from "../shared/DataTable";

const TableContainer = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
`;

const DetailModal = styled.div<{ $isOpen?: boolean }>`
  display: ${(props) => (props.$isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const ModalContent = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--t1, #1a1a1a);
`;

const JsonDiff = styled.div`
  background-color: var(--border-1, #e5dfd2);
  padding: 12px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  color: var(--focus-ring, #0e7a53);
  overflow-x: auto;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CloseButton = styled.button`
  background-color: var(--focus-ring, #0e7a53);
  color: var(--bg-deep, #f7f3ed);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 16px;
`;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
}

interface AuditLogTableProps {
  logs?: AuditLogEntry[];
  isLoading?: boolean;
}

export function AuditLogTable({
  logs = [],
  isLoading = false,
}: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = logs.find((l) => l.id === expandedId);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: "actor",
      label: "Actor",
      sortable: true,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (value) => <Badge variant="primary">{value}</Badge>,
    },
    {
      key: "entityType",
      label: "Entity Type",
      sortable: true,
    },
    {
      key: "entityId",
      label: "Entity ID",
      sortable: true,
      render: (value) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            color: "var(--t2, #4a4a4a)",
          }}
        >
          {value.substring(0, 8)}...
        </span>
      ),
    },
  ];

  const handleRowClick = (log: AuditLogEntry) => {
    if (log.dataBefore || log.dataAfter) {
      setExpandedId(log.id);
    }
  };

  return (
    <>
      <TableContainer>
        <Title>Audit Log</Title>
        <DataTable<AuditLogEntry>
          columns={columns}
          data={logs}
          pageSize={25}
          onRowClick={handleRowClick}
          loading={isLoading}
          emptyMessage="No audit logs available"
        />
      </TableContainer>

      <DetailModal $isOpen={!!expanded} onClick={() => setExpandedId(null)}>
        {expanded && (
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Audit Details</ModalTitle>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--t2, #4a4a4a)",
                  marginBottom: "4px",
                }}
              >
                Action
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--t1, #1a1a1a)",
                  fontWeight: "600",
                }}
              >
                {expanded.action} on {expanded.entityType} ({expanded.entityId})
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--t2, #4a4a4a)",
                  marginBottom: "4px",
                }}
              >
                Actor
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--focus-ring, #0e7a53)",
                  fontWeight: "600",
                }}
              >
                {expanded.actor}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--t2, #4a4a4a)",
                  marginBottom: "4px",
                }}
              >
                Timestamp
              </div>
              <div style={{ fontSize: "14px", color: "var(--t1, #1a1a1a)" }}>
                {new Date(expanded.timestamp).toLocaleString()}
              </div>
            </div>

            {expanded.dataBefore && (
              <>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--t2, #4a4a4a)",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
                >
                  Before
                </div>
                <JsonDiff>
                  {JSON.stringify(expanded.dataBefore, null, 2)}
                </JsonDiff>
              </>
            )}

            {expanded.dataAfter && (
              <>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--t2, #4a4a4a)",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
                >
                  After
                </div>
                <JsonDiff>
                  {JSON.stringify(expanded.dataAfter, null, 2)}
                </JsonDiff>
              </>
            )}

            <CloseButton onClick={() => setExpandedId(null)}>Close</CloseButton>
          </ModalContent>
        )}
      </DetailModal>
    </>
  );
}
