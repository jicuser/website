import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { NAV_GROUPS } from '@/content/nav';

export default function DesktopNavigation({ navigation, groups = NAV_GROUPS }) {
  const location = useLocation();
  const { pathname } = location;
  const [openPath, setOpenPath] = useState(null);
  const navRef = useRef(null);
  const hoverPathRef = useRef(null);

  useLayoutEffect(() => {
    hoverPathRef.current = null;
    setOpenPath(null);
  }, [location]);
  useEffect(() => {
    if (!openPath) return undefined;
    const closeOutside = (event) => {
      if (!navRef.current?.contains(event.target)) setOpenPath(null);
    };
    const desktop = window.matchMedia('(min-width: 1200px)');
    const closeOnResize = () => {
      if (!desktop.matches) setOpenPath(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    desktop.addEventListener('change', closeOnResize);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      desktop.removeEventListener('change', closeOnResize);
    };
  }, [openPath]);

  function handleKeys(event, path) {
    const group = event.currentTarget;
    const trigger = group.querySelector('button');
    if (!trigger) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpenPath(null);
      trigger.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    if (['Home', 'End'].includes(event.key) && event.target === trigger) return;
    event.preventDefault();
    setOpenPath(path);
    requestAnimationFrame(() => {
      const links = [...group.querySelectorAll('.jic-desktop-dropdown a')];
      if (!links.length || !group.isConnected) return;
      const index = links.indexOf(document.activeElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? links.length - 1
            : event.key === 'ArrowDown'
              ? (index + 1) % links.length
              : index < 0
                ? links.length - 1
                : (index - 1 + links.length) % links.length;
      links[next].focus();
    });
  }

  return (
    <nav ref={navRef} className="jic-desktop-primary-nav" aria-label="Primary navigation">
      {groups.map(({ name, path, children, sectionPaths = [path] }) => {
        const open = openPath === path;
        // Cross-links do not change which section owns the current page.
        const current = sectionPaths.includes(navigation?.primaryPath);
        const id = `jic-desktop-${path.slice(1) || 'home'}`;
        const currentChild =
          navigation?.path !== navigation?.primaryPath
            ? navigation?.path
            : navigation?.current?.path;
        return (
          <div
            className="jic-desktop-nav-group"
            key={path}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return;
              // Hover must not hide a submenu that someone is navigating with the keyboard.
              if (
                document.activeElement?.closest('.jic-desktop-dropdown') &&
                !event.currentTarget.contains(document.activeElement)
              )
                return;
              hoverPathRef.current = children.length ? path : null;
              setOpenPath(hoverPathRef.current);
            }}
            onPointerLeave={(event) => {
              if (!event.currentTarget.contains(document.activeElement)) setOpenPath(null);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
            }}
            onKeyDown={(event) => handleKeys(event, path)}
          >
            {children.length ? (
              <button
                type="button"
                className="jic-desktop-section-trigger"
                aria-expanded={open}
                aria-controls={id}
                aria-current={current ? 'location' : undefined}
                onClick={() => {
                  const openedByHover = hoverPathRef.current === path;
                  hoverPathRef.current = null;
                  setOpenPath((previous) => (previous === path && !openedByHover ? null : path));
                }}
              >
                {name}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            ) : (
              <Link to={path} aria-current={current ? 'page' : undefined}>
                {name}
              </Link>
            )}
            {children.length > 0 && (
              <div id={id} className="jic-desktop-dropdown" hidden={!open} data-glass="dense">
                {children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    aria-current={
                      current && currentChild === child.path
                        ? pathname === child.path
                          ? 'page'
                          : 'location'
                        : undefined
                    }
                    onClick={() => setOpenPath(null)}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
