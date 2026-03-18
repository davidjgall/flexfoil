import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useLayout } from '../contexts/LayoutContext';
import { useAirfoilStore } from '../stores/airfoilStore';
import { useTheme } from '../contexts/ThemeContext';
import { useOnboarding } from '../onboarding';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { buildSearchIndex, type SearchItem, type SearchCategory } from '../lib/searchIndex';

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  panel: 'Panel',
  feature: 'Feature',
  action: 'Action',
  tour: 'Tour',
};

const CATEGORY_COLORS: Record<SearchCategory, string> = {
  panel: 'var(--accent-primary)',
  feature: 'var(--brand-secondary)',
  action: 'var(--accent-warning)',
  tour: 'var(--text-muted)',
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onResetLayout: () => void;
}

export function CommandPalette({ open, onClose, onResetLayout }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { openPanel } = useLayout();
  const setControlMode = useAirfoilStore((s) => s.setControlMode);
  const { toggleTheme } = useTheme();
  const { startTour } = useOnboarding();
  const { undo, redo } = useUndoRedo();

  const searchItems = useMemo(
    () => buildSearchIndex({ setControlMode, startTour, toggleTheme, undo, redo, resetLayout: onResetLayout }),
    [setControlMode, startTour, toggleTheme, undo, redo, onResetLayout],
  );

  const fuse = useMemo(
    () =>
      new Fuse(searchItems, {
        keys: [
          { name: 'label', weight: 0.4 },
          { name: 'keywords', weight: 0.4 },
          { name: 'description', weight: 0.2 },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
      }),
    [searchItems],
  );

  const results: SearchItem[] = useMemo(() => {
    if (!query.trim()) return searchItems;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, searchItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeItem = useCallback(
    (item: SearchItem) => {
      onClose();
      if (item.href) {
        window.open(item.href, '_blank', 'noopener,noreferrer');
        return;
      }
      if (item.panelId) {
        openPanel(item.panelId);
      }
      if (item.postAction) {
        // Small delay so panel opens before mode switch
        requestAnimationFrame(() => item.postAction!());
      }
    },
    [onClose, openPanel],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            executeItem(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, executeItem, onClose],
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        animation: 'cmd-palette-fade 0.12s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          boxShadow: '0 16px 64px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          animation: 'cmd-palette-slide 0.15s ease-out',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search panels, features, actions..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 15,
              fontFamily: 'var(--font-sans)',
              padding: 0,
            }}
          />
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-muted)',
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {results.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No results for "{query}"
            </div>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              onClick={() => executeItem(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 16px',
                background: i === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                borderLeft: i === selectedIndex ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.08s ease',
              }}
            >
              {/* Category badge */}
              <span
                style={{
                  flexShrink: 0,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderRadius: 3,
                  background: `color-mix(in srgb, ${CATEGORY_COLORS[item.category]} 15%, transparent)`,
                  color: CATEGORY_COLORS[item.category],
                  border: `1px solid color-mix(in srgb, ${CATEGORY_COLORS[item.category]} 25%, transparent)`,
                }}
              >
                {CATEGORY_LABELS[item.category]}
              </span>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.description}
                </div>
              </div>

              {/* Shortcut */}
              {item.shortcut && (
                <kbd
                  style={{
                    flexShrink: 0,
                    padding: '1px 5px',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 3,
                    color: 'var(--text-muted)',
                  }}
                >
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: 16,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <span>
            <kbd style={kbdStyle}>↑↓</kbd> navigate
          </span>
          <span>
            <kbd style={kbdStyle}>↵</kbd> select
          </span>
          <span>
            <kbd style={kbdStyle}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: '0 4px',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  marginRight: 3,
};
