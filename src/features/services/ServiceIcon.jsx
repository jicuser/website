import React from 'react';
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Heart,
  HeartHandshake,
  Sparkles,
  Users,
} from 'lucide-react';
const icons = {
  book: BookOpen,
  calendar: CalendarDays,
  graduation: GraduationCap,
  heart: Heart,
  support: HeartHandshake,
  sparkles: Sparkles,
  users: Users,
};
export default function ServiceIcon({ name, ...props }) {
  const Icon = icons[name] || HeartHandshake;
  return <Icon {...props} />;
}
