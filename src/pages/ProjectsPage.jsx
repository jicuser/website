import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Target, CheckCircle, Phone, Building2, BookOpen, Users } from 'lucide-react';
import { IMAGES } from '@/content/images';
import { PROJECTS_HERO, APPEAL_TARGET, EQUIPMENT_LIST, HOW_TO_DONATE, VISION_BULLETS } from '@/content/pages/projects';

const projectAreas = [
  { id: 'madrassah-project', title: 'Madrassah Project', text: 'Learning spaces and facilities for the next generation.', icon: BookOpen },
  { id: 'community-hall', title: 'Community Hall', text: 'A flexible community space for classes, events and local initiatives.', icon: Users },
  { id: 'main-prayer-hall', title: 'Main Prayer Hall', text: 'Updates and improvements to the main worship space.', icon: Building2 },
];

export default function ProjectsPage() {
  return (
    <div className="page-transition pt-24">
      <section id="masjid-extension" className="jic-anchor-target relative py-20 md:py-32 bg-gray-50 dark:bg-gray-800">
        <div className="absolute inset-0 islamic-pattern opacity-5 z-0" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-primary">JIC Projects</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-4">{PROJECTS_HERO.heading}</h1>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">{PROJECTS_HERO.subheading}</p>
          </motion.div>
        </div>
      </section>

      <section id="funeral-service" className="jic-anchor-target py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold">Our Goal</CardTitle>
                  <CardDescription>We are raising funds to acquire essential equipment for a community-focused funeral service.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="bg-primary/10 p-6 rounded-xl text-center">
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Appeal Target</p>
                      <p className="text-4xl font-bold text-primary">£{APPEAL_TARGET.toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Equipment Needed</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {EQUIPMENT_LIST.map((item) => (
                          <Card key={item.name} className="bg-gray-50 dark:bg-gray-800 h-full">
                            <CardContent className="pt-6 flex items-start space-x-4">
                              <AlertCircle className="w-6 h-6 text-primary shrink-0" />
                              <div><p className="font-semibold text-lg text-gray-900 dark:text-white">{item.name}</p><p className="text-primary font-bold text-xl">£{item.cost.toLocaleString()}</p></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card id="donate" className="jic-anchor-target bg-primary/10 border-primary/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-6 h-6 text-primary" />{HOW_TO_DONATE.heading}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{HOW_TO_DONATE.body}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{HOW_TO_DONATE.note}</p>
                  <Button asChild className="w-full mt-6"><Link to={HOW_TO_DONATE.ctaTo}>{HOW_TO_DONATE.ctaLabel}</Link></Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-6 h-6 text-primary" />Our Vision</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {VISION_BULLETS.map((b) => <div key={b} className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-primary mt-1 shrink-0" /><p className="text-gray-700 dark:text-gray-300">{b}</p></div>)}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background pb-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Project Areas</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Building for worship, learning and community</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {projectAreas.map(({ id, title, text, icon: Icon }) => (
              <article id={id} key={id} className="jic-anchor-target rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div>
                <h3 className="text-xl font-bold text-card-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="update-gallery" className="jic-anchor-target bg-background pb-16 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center"><h2 className="text-2xl font-bold text-foreground">Project Updates</h2><p className="mt-2 text-sm text-muted-foreground">Latest appeal and project information from JIC.</p></div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden shadow-xl max-w-4xl mx-auto border border-border">
            <img src={IMAGES.funeralAppeal} alt="Funeral Service Appeal Details Poster" className="w-full h-auto object-cover" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
