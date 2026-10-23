import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { groupPublishedTeamMembers, TEAM_GROUPS } from '@/lib/teamMembers';

function TeamProfiles({ people }) {
  if (!people.length)
    return (
      <p className="about-empty">
        Profiles are not available yet.{' '}
        <Link to="/about#contact">
          Contact the centre <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </p>
    );
  return (
    <div className="about-people">
      {people.map((person) => (
        <article
          className={`about-person ${person.image_url ? 'has-portrait' : ''}`}
          key={person.id}
        >
          {person.image_url ? (
            <img src={person.image_url} alt={person.name} loading="lazy" width="320" height="320" />
          ) : (
            <span className="about-person-initials" aria-hidden="true">
              {person.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join('')}
            </span>
          )}
          <div>
            <h3>{person.name}</h3>
            {person.role_title && <p className="about-person-role">{person.role_title}</p>}
            {person.bio && (
              <details>
                <summary>About {person.name.split(' ')[0]}</summary>
                <p>{person.bio}</p>
              </details>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function TeamDirectory() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    supabase
      .from('team_members')
      .select('*')
      .eq('published', true)
      .order('sort_order')
      .abortSignal(controller.signal)
      .then(({ data, error: problem }) => {
        if (controller.signal.aborted) return;
        if (problem) setError(true);
        else setTeam(data || []);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  const { groups, unassigned } = groupPublishedTeamMembers(team);
  const selected =
    active ||
    TEAM_GROUPS.find((group) => groups[group.value].length)?.value ||
    TEAM_GROUPS[0].value;
  return (
    <>
      {(loading || error || Object.values(groups).some((people) => people.length)) && (
        <Tabs value={selected} onValueChange={setActive}>
          <TabsList className="jic-team-tabs about-team-tabs" aria-label="Team sections">
            {TEAM_GROUPS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
                {!loading && !error && <span>{groups[value].length}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {TEAM_GROUPS.map(({ value, label, description }) => (
            <TabsContent key={value} value={value} className="about-team-group">
              <div className="about-section-intro">
                <h3>{label}</h3>
                <p>{description}</p>
              </div>
              {loading ? (
                <p role="status" className="about-empty">
                  Loading profiles…
                </p>
              ) : error ? (
                <div className="about-empty">
                  <p role="alert">We couldn’t load the team profiles.</p>
                  <button
                    type="button"
                    className="about-text-link"
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    Try again <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <TeamProfiles people={groups[value]} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
      {!loading && !error && !team.length && <TeamProfiles people={[]} />}
      {!loading && !error && unassigned.length > 0 && (
        <section className="about-team-group" aria-labelledby="other-team-members">
          <h3 id="other-team-members">
            <Users size={22} aria-hidden="true" /> Our team
          </h3>
          <TeamProfiles people={unassigned} />
        </section>
      )}
    </>
  );
}
