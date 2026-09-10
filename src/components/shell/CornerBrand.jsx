import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CornerBrand() {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.02 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      to="/"
      className={`jic-corner-brand${footerVisible ? ' is-hidden' : ''}`}
      aria-label="Jamatia Islamic Centre home"
    >
      <img src="/jic-minaret-wordmark.svg" alt="Jamatia Islamic Centre" decoding="async" />
    </Link>
  );
}
