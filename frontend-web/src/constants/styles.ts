import React from 'react';

/** Glass card base style (shared across all pages). */
export const glassCard: React.CSSProperties = {
  background: 'var(--c-bg-card)',
  backdropFilter: 'blur(20px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--c-border)',
  boxShadow: 'var(--shadow-card)',
};

/** Glass card with hidden overflow (for image containers). */
export const glassCardOverflow: React.CSSProperties = {
  ...glassCard,
  overflow: 'hidden',
};

/** Section heading with gradient text. */
export const gradientHeading: React.CSSProperties = {
  margin: 0,
  fontWeight: 800,
  background: 'linear-gradient(135deg, var(--c-primary-light), var(--c-accent-light))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

/** Image wrapper with rounded corners and border. */
export const imageFrame: React.CSSProperties = {
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  border: '1px solid var(--c-border)',
  boxShadow: 'var(--shadow-card)',
};

/** Small uppercase label above image sections. */
export const imageLabel: React.CSSProperties = {
  fontSize: 12,
  display: 'block',
  marginBottom: 10,
  color: 'var(--c-text-muted)',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
};

/** Stat section heading. */
export const statHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--c-text-muted)',
  marginBottom: 18,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};

/** Provider select width. */
export const PROVIDER_SELECT_WIDTH = 120;
