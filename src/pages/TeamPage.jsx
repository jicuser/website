import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { groupPublishedTeamMembers, TEAM_GROUPS } from '@/lib/teamMembers';

function TeamProfiles({ people }) {
  if (!people.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Profiles are not available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <Card key={person.id} className="h-full overflow-hidden">
          <CardContent className="p-0">
            {person.image_url ? (
              <img
                src={person.image_url}
                alt={person.name}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center bg-muted">
                <Users className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="p-6">
              <h3 className="text-xl font-bold">{person.name}</h3>
              {person.role_title && <p className="mt-1 font-medium">{person.role_title}</p>}
              {person.bio && (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {person.bio}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    async function loadTeam() {
      try {
        const { data, error: queryError } = await supabase
          .from('team_members')
          .select('*')
          .eq('published', true)
          .order('sort_order');
        if (queryError) throw queryError;
        if (!cancelled) setTeam(data || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const { groups, unassigned } = groupPublishedTeamMembers(team);

  return (
    <div className="page-transition pt-24">
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Meet the Team</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            The people who founded Jamatia Islamic Centre and those who serve our community today.
          </p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="founder_members">
            <TabsList className="jic-team-tabs" aria-label="Team sections">
              {TEAM_GROUPS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TEAM_GROUPS.map(({ value, label, description }) => (
              <TabsContent key={value} value={value} className="mt-6">
                <div className="mb-6">
                  <h2 className="font-bold">{label}</h2>
                  <p className="mt-2 text-muted-foreground">{description}</p>
                </div>
                {loading ? (
                  <p role="status" className="py-8 text-center text-muted-foreground">
                    Loading profiles…
                  </p>
                ) : error ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p role="alert">We couldn’t load the team profiles. Please try again.</p>
                      <Button className="mt-4" onClick={() => setAttempt((value) => value + 1)}>
                        Try again
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <TeamProfiles people={groups[value]} />
                )}
              </TabsContent>
            ))}
          </Tabs>
          {!loading && !error && unassigned.length > 0 && (
            <section className="mt-10" aria-labelledby="other-team-members">
              <h2 id="other-team-members" className="mb-6 font-bold">
                Our team
              </h2>
              <TeamProfiles people={unassigned} />
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
