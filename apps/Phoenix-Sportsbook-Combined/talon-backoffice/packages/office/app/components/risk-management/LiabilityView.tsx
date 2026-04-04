'use client';

import styled from 'styled-components';
import { useState } from 'react';

const TreeContainer = styled.div`
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const TreeNode = styled.div`
  margin-left: 16px;
  border-left: 1px solid #0f3460;
  padding-left: 16px;
`;

const NodeRoot = styled.div`
  margin-left: 0;
  border-left: none;
  padding-left: 0;
`;

const NodeLabel = styled.div<{ $level?: number; $highlighted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  background-color: ${(props) => (props.$highlighted ? 'rgba(248, 113, 113, 0.1)' : 'transparent')};
  border-radius: 3px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(74, 126, 255, 0.1);
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: #4a7eff;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.8;
  }
`;

const NodeContent = styled.div`
  flex: 1;
`;

const NodeName = styled.span`
  color: #ffffff;
  font-weight: 500;
  font-size: 13px;
`;

const NodeLiability = styled.span<{ $high?: boolean }>`
  color: ${(props) => (props.$high ? '#f87171' : '#4a7eff')};
  font-weight: 600;
  font-size: 12px;
  margin-left: auto;
`;

interface LiabilityNode {
  id: string;
  name: string;
  liability: number;
  children?: LiabilityNode[];
  isHighExposure?: boolean;
}

interface LiabilityViewProps {
  fixtures?: LiabilityNode[];
}

interface NodeComponentProps {
  node: LiabilityNode;
  level: number;
}

function LiabilityNode({ node, level }: NodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;

  const NodeComponent = level === 0 ? NodeRoot : TreeNode;

  return (
    <NodeComponent>
      <NodeLabel $level={level} $highlighted={node.isHighExposure}>
        {hasChildren && (
          <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '▼' : '▶'}
          </ExpandButton>
        )}
        {!hasChildren && <div style={{ width: '16px' }} />}
        <NodeContent>
          <NodeName>{node.name}</NodeName>
        </NodeContent>
        <NodeLiability $high={node.isHighExposure}>
          ${(node.liability / 1000).toFixed(1)}K
        </NodeLiability>
      </NodeLabel>

      {isExpanded &&
        hasChildren &&
        node.children.map((child) => (
          <LiabilityNode key={child.id} node={child} level={level + 1} />
        ))}
    </NodeComponent>
  );
}

export function LiabilityView({ fixtures = [] }: LiabilityViewProps) {
  return (
    <TreeContainer>
      <Title>Liability Breakdown</Title>
      {fixtures.length > 0 ? (
        fixtures.map((fixture) => (
          <LiabilityNode key={fixture.id} node={fixture} level={0} />
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#a0a0a0', fontSize: '12px' }}>
          No liability data available
        </div>
      )}
    </TreeContainer>
  );
}
