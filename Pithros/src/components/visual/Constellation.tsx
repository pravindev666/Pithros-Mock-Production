import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Heart } from 'lucide-react';
import { FamilyMember } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export interface ConstellationProps {
  memorialName?: string;
  familyMembers?: FamilyMember[];
  className?: string;
  onSelectMember?: (member: FamilyMember) => void;
  decorative?: boolean;
}

interface NodePosition {
  member?: FamilyMember;
  x: number;
  y: number;
  label: string;
  relation: string;
  isCenter?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Pure Decorative Constellation (No cards, no borders, no panels)
// ─────────────────────────────────────────────────────────────
export const DecorativeConstellation: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { isDark } = useTheme();

  const strokeColor = isDark ? '#D9D2C6' : '#7D766D';
  const accentColor = isDark ? '#B99452' : '#23324A';
  const outerStroke = isDark ? '#D9D2C6' : '#23324A';

  // Celestial node positions
  const decorativeNodes = [
    { x: 380, y: 75, r: 2.5, ring: true, highlight: true },
    { x: 270, y: 115, r: 2, ring: false, highlight: false },
    { x: 490, y: 115, r: 2, ring: false, highlight: false },
    { x: 170, y: 205, r: 2.2, ring: true, highlight: false },
    { x: 295, y: 220, r: 2, ring: false, highlight: true },
    { x: 465, y: 220, r: 2, ring: false, highlight: true },
    { x: 590, y: 205, r: 2.2, ring: true, highlight: false },
    { x: 280, y: 315, r: 2, ring: false, highlight: false },
    { x: 480, y: 315, r: 2, ring: false, highlight: false },
    { x: 380, y: 345, r: 2.5, ring: true, highlight: true },
    { x: 205, y: 140, r: 1.5, ring: false, highlight: false },
    { x: 555, y: 140, r: 1.5, ring: false, highlight: false },
    { x: 215, y: 280, r: 1.5, ring: false, highlight: false },
    { x: 545, y: 280, r: 1.5, ring: false, highlight: false },
  ];

  // Fine constellation connection vectors
  const decorativeLines = [
    { x1: 380, y1: 210, x2: 380, y2: 75, highlight: true, strokeWidth: '0.8' },
    { x1: 380, y1: 210, x2: 270, y2: 115, highlight: false, strokeWidth: '0.7' },
    { x1: 380, y1: 210, x2: 490, y2: 115, highlight: false, strokeWidth: '0.7' },
    { x1: 380, y1: 210, x2: 295, y2: 220, highlight: true, strokeWidth: '0.75' },
    { x1: 380, y1: 210, x2: 465, y2: 220, highlight: true, strokeWidth: '0.75' },
    { x1: 380, y1: 210, x2: 280, y2: 315, highlight: false, strokeWidth: '0.7' },
    { x1: 380, y1: 210, x2: 480, y2: 315, highlight: false, strokeWidth: '0.7' },
    { x1: 380, y1: 210, x2: 380, y2: 345, highlight: true, strokeWidth: '0.8' },
    // Perimeter & kinship geometry
    { x1: 270, y1: 115, x2: 380, y2: 75, highlight: false, strokeWidth: '0.65' },
    { x1: 380, y1: 75, x2: 490, y2: 115, highlight: false, strokeWidth: '0.65' },
    { x1: 270, y1: 115, x2: 205, y2: 140, highlight: false, strokeWidth: '0.6' },
    { x1: 205, y1: 140, x2: 170, y2: 205, highlight: false, strokeWidth: '0.6' },
    { x1: 170, y1: 205, x2: 295, y2: 220, highlight: false, strokeWidth: '0.65' },
    { x1: 170, y1: 205, x2: 215, y2: 280, highlight: false, strokeWidth: '0.6' },
    { x1: 215, y1: 280, x2: 280, y2: 315, highlight: false, strokeWidth: '0.6' },
    { x1: 280, y1: 315, x2: 380, y2: 345, highlight: false, strokeWidth: '0.65' },
    { x1: 380, y1: 345, x2: 480, y2: 315, highlight: false, strokeWidth: '0.65' },
    { x1: 480, y1: 315, x2: 545, y2: 280, highlight: false, strokeWidth: '0.6' },
    { x1: 545, y1: 280, x2: 590, y2: 205, highlight: false, strokeWidth: '0.6' },
    { x1: 590, y1: 205, x2: 465, y2: 220, highlight: false, strokeWidth: '0.65' },
    { x1: 590, y1: 205, x2: 555, y2: 140, highlight: false, strokeWidth: '0.6' },
    { x1: 555, y1: 140, x2: 490, y2: 115, highlight: false, strokeWidth: '0.6' },
  ];

  // Subtle ambient stars
  const backgroundStars = [
    { cx: 110, cy: 90, r: 1.2, opD: 0.22, opL: 0.25 },
    { cx: 650, cy: 85, r: 1.2, opD: 0.25, opL: 0.28 },
    { cx: 130, cy: 350, r: 1.1, opD: 0.18, opL: 0.22 },
    { cx: 630, cy: 340, r: 1.1, opD: 0.2, opL: 0.24 },
    { cx: 340, cy: 45, r: 1.0, opD: 0.2, opL: 0.22 },
    { cx: 420, cy: 45, r: 1.0, opD: 0.2, opL: 0.22 },
    { cx: 230, cy: 360, r: 1.0, opD: 0.16, opL: 0.2 },
    { cx: 530, cy: 360, r: 1.0, opD: 0.16, opL: 0.2 },
  ];

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto flex items-center justify-center pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 760 420"
        className="w-full h-auto max-h-[380px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle background star dust */}
        {backgroundStars.map((star, idx) => (
          <circle
            key={`bg-star-${idx}`}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill={accentColor}
            fillOpacity={isDark ? star.opD : star.opL}
          />
        ))}

        {/* Faint celestial orbit ellipse */}
        <ellipse
          cx="380"
          cy="210"
          rx="270"
          ry="135"
          stroke={outerStroke}
          strokeWidth="0.6"
          strokeDasharray="3 7"
          strokeOpacity={isDark ? '0.1' : '0.14'}
          transform="rotate(-5 380 210)"
        />

        {/* Delicate constellation connecting lines */}
        {decorativeLines.map((line, idx) => (
          <motion.path
            key={`line-${idx}`}
            d={`M${line.x1} ${line.y1} L${line.x2} ${line.y2}`}
            stroke={line.highlight ? accentColor : strokeColor}
            strokeWidth={line.strokeWidth}
            strokeDasharray="4 6"
            strokeOpacity={
              line.highlight
                ? isDark ? 0.22 : 0.24
                : isDark ? 0.14 : 0.18
            }
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: idx * 0.03, ease: 'easeOut' }}
          />
        ))}

        {/* Center gentle beacon */}
        <circle
          cx="380"
          cy="210"
          r="16"
          fill={accentColor}
          fillOpacity={isDark ? 0.06 : 0.08}
        />
        <circle
          cx="380"
          cy="210"
          r="6"
          fill={accentColor}
          fillOpacity={isDark ? 0.25 : 0.3}
        />
        <circle
          cx="380"
          cy="210"
          r="2.5"
          fill={isDark ? '#F8F5EE' : '#FCFAF5'}
        />

        {/* Constellation nodes */}
        {decorativeNodes.map((node, idx) => (
          <g key={`node-${idx}`}>
            {node.ring && (
              <circle
                cx={node.x}
                cy={node.y}
                r="7"
                fill={accentColor}
                fillOpacity={isDark ? 0.07 : 0.09}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={node.highlight ? accentColor : (isDark ? '#D9D2C6' : '#7D766D')}
              fillOpacity={isDark ? 0.55 : 0.6}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export const Constellation: React.FC<ConstellationProps> = ({
  memorialName = 'Beloved Memorial',
  familyMembers = [],
  className = '',
  onSelectMember,
  decorative = false,
}) => {
  const { isDark } = useTheme();

  // If decorative mode is requested, render the pure atmospheric graphic
  // without any container border, background card surface, header, labels, or directory cards.
  if (decorative) {
    return <DecorativeConstellation className={className} />;
  }

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Group members into categories
  const parents = familyMembers.filter((m) => m.relationship === 'Parent');
  const spouses = familyMembers.filter((m) => m.relationship === 'Spouse');
  const siblings = familyMembers.filter((m) => m.relationship === 'Sibling');
  const children = familyMembers.filter((m) => m.relationship === 'Child');
  const others = familyMembers.filter(
    (m) =>
      m.relationship === 'Grandchild' ||
      m.relationship === 'Close Friend' ||
      m.relationship === 'Other'
  );

  const nodes: NodePosition[] = [];
  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; id: string }[] = [];

  // Central Memorial Node
  const centerX = 350;
  const centerY = 190;
  nodes.push({
    x: centerX,
    y: centerY,
    label: memorialName,
    relation: 'In Memory',
    isCenter: true,
  });

  // Position Parents above
  parents.forEach((p, idx) => {
    const x = parents.length === 1 ? centerX : centerX - 70 + idx * 140;
    const y = 70;
    nodes.push({ member: p, x, y, label: p.name, relation: p.relationship });
    connections.push({ from: { x: centerX, y: centerY }, to: { x, y }, id: `p-${idx}` });
  });

  // Position Spouse to right
  spouses.forEach((s, idx) => {
    const x = centerX + 185;
    const y = centerY - 10 + idx * 50;
    nodes.push({ member: s, x, y, label: s.name, relation: s.relationship });
    connections.push({ from: { x: centerX, y: centerY }, to: { x, y }, id: `s-${idx}` });
  });

  // Position Siblings to left
  siblings.forEach((s, idx) => {
    const x = centerX - 185;
    const y = centerY - 10 + idx * 50;
    nodes.push({ member: s, x, y, label: s.name, relation: s.relationship });
    connections.push({ from: { x: centerX, y: centerY }, to: { x, y }, id: `sib-${idx}` });
  });

  // Position Children below
  children.forEach((c, idx) => {
    const offset = (idx - (children.length - 1) / 2) * 120;
    const x = centerX + offset;
    const y = 300;
    nodes.push({ member: c, x, y, label: c.name, relation: c.relationship });
    connections.push({ from: { x: centerX, y: centerY }, to: { x, y }, id: `c-${idx}` });
  });

  // Position Grandchildren / Others further below
  others.forEach((o, idx) => {
    const offset = (idx - (others.length - 1) / 2) * 120;
    const x = centerX + offset;
    const y = 385;
    nodes.push({ member: o, x, y, label: o.name, relation: o.relationship });
    const childTarget = children[idx % Math.max(1, children.length)];
    const fromPos = childTarget
      ? { x: centerX + ((idx % children.length) - (children.length - 1) / 2) * 120, y: 300 }
      : { x: centerX, y: centerY };
    connections.push({ from: fromPos, to: { x, y }, id: `o-${idx}` });
  });

  const handleNodeClick = (node: NodePosition) => {
    if (node.member) {
      setSelectedMember(node.member);
      onSelectMember?.(node.member);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, node: NodePosition) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNodeClick(node);
    }
  };

  // Color tokens
  const strokeColor = isDark ? '#D9D2C6' : '#23324A';
  const nodeCenterBg = isDark ? '#202C40' : '#E5DED2';
  const nodeItemBg = isDark ? '#182337' : '#FCFAF5';
  const accentColor = isDark ? '#B99452' : '#23324A';
  const textColor = isDark ? '#F8F5EE' : '#20242A';
  const textMutedColor = isDark ? '#9EA3AA' : '#554F48';

  return (
    <div
      className={`relative w-full max-w-3xl mx-auto rounded-2xl border p-4 md:p-6 transition-colors ${
        isDark
          ? 'border-[#202C40] bg-[#182337]/90'
          : 'border-[#E5DED2] bg-[#FCFAF5]'
      } ${className}`}
    >
      {/* Subtle background glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDark ? 'bg-[#B99452]/5' : 'bg-[#23324A]/8'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            Circle of Remembrance
          </span>
          <h4 className={`text-lg font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
            Family Constellation
          </h4>
        </div>
        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span>Shared Memories</span>
        </div>
      </div>

      {/* SVG Constellation Graphic */}
      <div className="relative w-full aspect-[7/4.5] min-h-[320px] overflow-hidden rounded-xl">
        <svg
          viewBox="0 0 700 440"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`Family constellation diagram for ${memorialName}`}
        >
          {/* Subtle star points in background */}
          <circle cx="80" cy="90" r="1.5" fill={accentColor} fillOpacity={isDark ? 0.2 : 0.25} />
          <circle cx="620" cy="80" r="1.5" fill={accentColor} fillOpacity={isDark ? 0.25 : 0.3} />
          <circle cx="120" cy="380" r="1.5" fill={accentColor} fillOpacity={isDark ? 0.2 : 0.25} />
          <circle cx="580" cy="360" r="1.5" fill={accentColor} fillOpacity={isDark ? 0.2 : 0.25} />

          {/* Connection Lines */}
          {connections.map((conn) => (
            <motion.path
              key={conn.id}
              d={`M${conn.from.x} ${conn.from.y} L${conn.to.x} ${conn.to.y}`}
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeOpacity={isDark ? 0.25 : 0.35}
              strokeDasharray="4 5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
            />
          ))}

          {/* Interactive Nodes */}
          {nodes.map((node, i) => {
            const isHovered = hoveredNode === node.label;
            const isSelected = selectedMember?.name === node.label;
            return (
              <g
                key={i}
                tabIndex={0}
                role="button"
                aria-label={`${node.label} (${node.relation})`}
                className="cursor-pointer focus:outline-none group"
                onMouseEnter={() => setHoveredNode(node.label)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
                onKeyDown={(e) => handleKeyDown(e, node)}
              >
                {/* Glow ring on hover/focus */}
                {(isHovered || isSelected) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isCenter ? 38 : 26}
                    fill={accentColor}
                    fillOpacity={isDark ? 0.18 : 0.22}
                    className="transition-all duration-300"
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.isCenter ? 24 : 14}
                  fill={node.isCenter ? nodeCenterBg : nodeItemBg}
                  stroke={node.isCenter ? accentColor : isHovered || isSelected ? accentColor : strokeColor}
                  strokeWidth={node.isCenter ? 2 : 1.4}
                  strokeOpacity={node.isCenter ? 0.95 : isHovered || isSelected ? 0.95 : 0.5}
                  className="transition-all duration-200"
                />

                {/* Inner dot */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.isCenter ? 5 : 3}
                  fill={accentColor}
                />

                {/* Labels */}
                <text
                  x={node.x}
                  y={node.y + (node.isCenter ? 38 : 28)}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={node.isCenter ? "13" : "11.5"}
                  fontFamily="'Noto Sans', sans-serif"
                  fontWeight={node.isCenter ? "600" : "500"}
                  className="select-none pointer-events-none"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + (node.isCenter ? 52 : 42)}
                  textAnchor="middle"
                  fill={textMutedColor}
                  fontSize="10"
                  fontFamily="'Noto Sans', sans-serif"
                  className="select-none pointer-events-none"
                >
                  {node.relation}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Accessible List Representation beneath visualization */}
      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
            <Users className="w-3.5 h-3.5" />
            Family Circle Directory ({familyMembers.length} members)
          </span>
          <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
            Lineage & Belonging
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {familyMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                setSelectedMember(member);
                onSelectMember?.(member);
              }}
              className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                selectedMember?.id === member.id
                  ? isDark
                    ? 'border-[#B99452] bg-[#202C40] text-[#F8F5EE]'
                    : 'border-[#23324A] bg-[#EFE1C5] text-[#20242A]'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337]/60 text-[#D9D2C6] hover:border-[#2D3D56] hover:bg-[#182337]'
                  : 'border-[#E5DED2] bg-[#E5DED2]/60 text-[#554F48] hover:border-[#C5B9A6] hover:bg-[#E5DED2]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{member.name}</span>
                <Heart className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
              </div>
              <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                {member.relationship} • {member.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
