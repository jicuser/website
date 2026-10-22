import React from 'react';
import { POSTER_WEBSITE_LOCATIONS } from '@/lib/posters';
import { posterWebsiteLocations, posterWebsiteLocationLabel } from '@/lib/programmePlacement';

/** The catalogue owns website locations; each screen keeps its own poster selection. */
export default function PosterLocations({ poster, pages = [], onChange, disabled = false }) {
  const locations = posterWebsiteLocations(poster, pages);
  return (
    <fieldset className="poster-locations" disabled={disabled}>
      <legend>Website poster locations</legend>
      <p>Choose where this poster appears. Publish posters to apply your selection.</p>
      <div className="poster-location-options">
        {POSTER_WEBSITE_LOCATIONS.map((path) => (
          <label className="admin-check" key={path}>
            <input
              type="checkbox"
              checked={locations.includes(path)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...locations, path]
                    : locations.filter((value) => value !== path),
                )
              }
            />
            {posterWebsiteLocationLabel(path)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
