import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('team_members').select('*').eq('published', true).order('sort_order')
      .then(({ data }) => setTeam(data || []))
      .finally(() => setLoading(false));
  }, []);

  return <div className="page-transition pt-24">
    <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-16 dark:from-gray-800/50 dark:to-gray-900/50">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">Meet Our Team</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-300">The people serving Jamatia Islamic Centre and its community.</p>
      </div>
    </section>
    <section className="py-16"><div className="container mx-auto px-4">
      {loading ? <p className="text-center text-gray-500">Loading team…</p> : team.length ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{team.map((person, i) => (
          <motion.div key={person.id} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.05}}>
            <Card className="h-full overflow-hidden"><CardContent className="p-0">
              {person.image_url ? <img src={person.image_url} alt={person.name} className="aspect-[4/3] w-full object-cover" loading="lazy"/> : <div className="grid aspect-[4/3] place-items-center bg-gray-100 dark:bg-gray-800"><Users className="h-16 w-16 text-gray-300"/></div>}
              <div className="p-6"><h2 className="text-xl font-bold">{person.name}</h2><p className="mt-1 font-medium text-primary">{person.role_title}</p>{person.bio&&<p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{person.bio}</p>}</div>
            </CardContent></Card>
          </motion.div>
        ))}</div>
      ) : <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">Team profiles will appear here once published by JIC.</div>}
    </div></section>
  </div>;
}
