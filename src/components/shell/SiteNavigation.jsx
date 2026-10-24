import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Building2, ChevronDown, ChevronRight, Clock,
  HeartHandshake, Heart, Home, Info, Layers, LogIn, Menu, Moon,
  Phone, Search, Settings, Sun, User, Users, X,
} from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { useAppearance } from '@/context/AppearanceContext';
import { activeDrawerPath } from '@/lib/drawerNavigation';
import '@/styles/site-navigation.css';

const destinationIcons = {
  '/': Home,
  '/prayer-times': Clock,
  '/funerals': HeartHandshake,
  '/services/nikah': Heart,
  '/worship': BookOpen,
  '/education': BookOpen,
  '/madrassah': BookOpen,
  '/services': Users,
  '/projects': Building2,
  '/donate': Heart,
  '/about': Info,
  '/contact': Phone,
};

export function HeaderActions({ open, view, onOpen }) {
  return (
    <nav className="jic-header-actions" aria-label="Quick navigation">
      <Link to="/search" className="jic-header-icon" aria-label="Search site" title="Search">
        <Search size={21} aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="jic-header-icon"
        aria-label="Appearance settings"
        title="Appearance settings"
        aria-haspopup="dialog"
        aria-controls="jic-site-menu"
        aria-expanded={open && view === 'appearance'}
        onClick={() => onOpen('appearance')}
      >
        <Settings size={21} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="jic-header-icon jic-header-menu-button"
        aria-label="Open navigation menu"
        title="Menu"
        aria-haspopup="dialog"
        aria-controls="jic-site-menu"
        aria-expanded={open && view === 'navigation'}
        onClick={() => onOpen('navigation')}
      >
        <Menu size={24} aria-hidden="true" />
      </button>
    </nav>
  );
}

export function AppearanceControls() {
  const { theme, setTheme, glassEnabled, setGlassEnabled } = useAppearance();
  return (
    <div className="jic-appearance-controls">
      <fieldset className="jic-theme-options">
        <legend>Colour mode</legend>
        <div>
          {[
            ['light', 'Light', Sun],
            ['dark', 'Dark', Moon],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="jic-transparency-switch"
        role="switch"
        aria-label="Transparency"
        aria-checked={glassEnabled}
        aria-describedby="jic-transparency-description"
        onClick={() => setGlassEnabled(!glassEnabled)}
      >
        <Layers size={21} aria-hidden="true" />
        <span>
          <strong>Transparency</strong>
          <small id="jic-transparency-description">Glass effects</small>
        </span>
        <span className="jic-switch-track" aria-hidden="true"><span /></span>
      </button>
      <p className="jic-appearance-note">Saved on this device. Glass works with either colour mode.</p>
    </div>
  );
}

export function NavigationDrawer({ open, view, groups, pathname, accountLabel, onClose, onViewChange, onDonate }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [expanded, setExpanded] = useState({});
  const active = activeDrawerPath(groups, pathname);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const trigger = document.activeElement;
    setExpanded({});
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // Do not steal focus from a destination that has already focused its content.
      if (trigger?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open, view]);

  // Native dialogs isolate the page, but Tab can still enter browser chrome.
  // Wrap within the currently visible controls, including expanded subpages.
  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]',
    )).filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0 && getComputedStyle(control).visibility !== 'hidden');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <dialog
      id="jic-site-menu"
      ref={dialogRef}
      className="jic-unified-menu jic-navigation-drawer"
      aria-label={view === 'appearance' ? 'Appearance settings' : 'Navigation menu'}
      onKeyDown={containKeyboardFocus}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <div className="jic-navigation-head">
        <Link to="/" className="jic-drawer-brand" aria-label="Jamatia Islamic Centre home" onClick={onClose}>
          <JamatiaLogo variant="wordmark" />
        </Link>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close navigation menu">
          <X size={23} aria-hidden="true" />
        </button>
      </div>
      <div className="jic-navigation-scroll" key={view}>
        {view === 'appearance' ? (
          <section className="jic-appearance-page" aria-labelledby="jic-appearance-title">
            <button type="button" className="jic-settings-back" onClick={() => onViewChange('navigation')}>
              <ArrowLeft size={18} aria-hidden="true" /> All pages
            </button>
            <h2 id="jic-appearance-title"><Settings size={22} aria-hidden="true" /> Appearance</h2>
            <AppearanceControls />
          </section>
        ) : (
          <>
            <nav aria-label="All pages">
              <ul className="jic-drawer-list">
                {groups.map(({ name, path, children = [] }) => {
                  const Icon = destinationIcons[path] || Users;
                  const subpages = children.filter((child) => child.path !== path);
                  const childrenId = `jic-drawer-${encodeURIComponent(path)}-children`;
                  return (
                    <li key={path}>
                      <div className="jic-drawer-row">
                        <Link
                          to={path}
                          aria-current={active === path ? pathname === path ? 'page' : 'location' : undefined}
                          onClick={() => { if (pathname === path) onClose(); }}
                        >
                          <Icon className="jic-drawer-destination-icon" size={22} aria-hidden="true" />
                          <span>{name}</span>
                          {!subpages.length && <ChevronRight className="jic-drawer-chevron" size={17} aria-hidden="true" />}
                        </Link>
                        {subpages.length > 0 && (
                          <button
                            type="button"
                            className="jic-drawer-expand"
                            aria-label={`${expanded[path] ? 'Collapse' : 'Expand'} ${name} subpages`}
                            aria-expanded={Boolean(expanded[path])}
                            aria-controls={childrenId}
                            onClick={() => setExpanded((previous) => ({ [path]: !previous[path] }))}
                          >
                            <ChevronDown size={19} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {subpages.length > 0 && (
                        <ul id={childrenId} className="jic-drawer-children" hidden={!expanded[path]}>
                          {subpages.map((child) => (
                            <li key={`${child.path}-${child.name}`}>
                              <NavLink end to={child.path} onClick={() => { if (pathname === child.path) onClose(); }}>{child.name}</NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <details className="jic-drawer-appearance" open>
              <summary><Settings size={22} aria-hidden="true" /><span>Appearance</span><ChevronDown size={18} aria-hidden="true" /></summary>
              <AppearanceControls />
            </details>
            <nav className="jic-drawer-account" aria-label="Account and giving">
              <Link to="/portal" aria-label={accountLabel}><User size={19} aria-hidden="true" /><span>{accountLabel}</span></Link>
              <Link to="/admin/login" aria-label="Staff login"><LogIn size={19} aria-hidden="true" /><span>Staff login</span></Link>
              {!groups.some((group) => group.path === '/donate') && (
                <button type="button" onClick={onDonate}><Heart size={19} aria-hidden="true" /><span>Donate</span></button>
              )}
            </nav>
          </>
        )}
      </div>
    </dialog>
  );
}
