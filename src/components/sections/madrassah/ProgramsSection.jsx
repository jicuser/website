import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageChoices from '@/components/PageChoices';

const groups = [
  {
    id: 'children',
    label: 'Children',
    title: 'A foundation in learning',
    icon: BookOpen,
    description: 'Ask about introductory Islamic learning and Qur’an reading for your child.',
    topics: [
      'Qaida and Qur’an recitation',
      'Short surahs and daily duas',
      'Islamic manners and beliefs',
      'Stories of the Prophets',
      'Introduction to the Arabic alphabet',
    ],
  },
  {
    id: 'youth',
    label: 'Young people',
    title: 'Build on earlier learning',
    icon: GraduationCap,
    description:
      'Discuss a suitable next step based on previous Islamic learning and Qur’an study.',
    topics: [
      'Qur’an recitation with tajweed',
      'Memorisation of selected surahs',
      'Foundations of Islamic jurisprudence',
      'Islamic history and contemporary questions',
      'Arabic language',
    ],
  },
];
export default function ProgramsSection() {
  return (
    <section className="jic-learning-topics" aria-labelledby="pupil-learning-title">
      <div className="jic-learning-section-intro">
        <h2 id="pupil-learning-title">Classes & learning</h2>
        <p>
          Explore the topics, then confirm the current classes, age groups and timetable with the
          team.
        </p>
      </div>
      <Tabs defaultValue="children" className="jic-learning-topic-tabs">
        <TabsList aria-label="Pupil learning groups">
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="youth">Young people</TabsTrigger>
        </TabsList>
        {groups.map(({ id, title, description, topics, icon: Icon }) => (
          <TabsContent key={id} value={id}>
            <article className="jic-learning-topic-card">
              <div className="jic-learning-topic-intro">
                <span className="jic-learning-topic-icon" aria-hidden="true">
                  <Icon size={30} strokeWidth={1.5} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
              <ul>
                {topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
              <p className="jic-learning-note">
                Class times, places and curriculum are confirmed by the Madrassah.
              </p>
            </article>
          </TabsContent>
        ))}
      </Tabs>
      <PageChoices
        label="Class enquiries"
        items={[
          {
            path: '/madrassah/enrolment',
            description: 'Apply for a pupil place.',
            icon: GraduationCap,
            featured: true,
          },
          {
            path: '/education/courses',
            description: 'Adult learning is listed separately.',
            icon: BookOpen,
          },
        ]}
      />
    </section>
  );
}
