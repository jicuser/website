import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

const clean = value => value && value !== 'N/A' ? String(value) : '—';
const saveCanvas = (canvas, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.94);
  link.click();
};

const drawText = (ctx, text, x, y, options = {}) => {
  const { size = 28, weight = 500, align = 'left', color = '#f7f1e3' } = options;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text ?? ''), x, y);
};

const exportFullTimetable = (monthlyPrayerTimes, currentMonth) => {
  if (!monthlyPrayerTimes?.length) return;
  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = Math.max(1720, 360 + monthlyPrayerTimes.length * 42);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07111b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#dcb650'; ctx.fillRect(0, 0, canvas.width, 18);
  drawText(ctx, 'Jamatia Islamic Centre', 120, 95, { size: 30, weight: 700, color: '#dcb650' });
  drawText(ctx, `${currentMonth} Prayer Timetable`, 120, 160, { size: 54, weight: 750 });
  drawText(ctx, 'Begins and Jama‘ah times · Birmingham', 120, 214, { size: 25, color: '#b8c4cf' });

  const columns = [
    ['Date','d_date'],['Fajr B','fajr_begins'],['Fajr J','fajr_jamah'],['Dhuhr B','zuhr_begins'],['Dhuhr J','zuhr_jamah'],
    ['Asr B','asr_begins'],['Asr J','asr_jamah'],['Maghrib B','maghrib_begins'],['Maghrib J','maghrib_jamah'],['Isha B','isha_begins'],['Isha J','isha_jamah'],
  ];
  const left = 80, top = 300, rowH = 42, colW = (canvas.width - 160) / columns.length;
  ctx.fillStyle = '#102235'; ctx.fillRect(left, top, canvas.width - 160, rowH);
  columns.forEach(([label], i) => drawText(ctx, label, left + i * colW + colW / 2, top + rowH / 2, { size: 19, weight: 700, align: 'center', color: '#dcb650' }));
  monthlyPrayerTimes.forEach((day, row) => {
    const y = top + rowH * (row + 1);
    if (row % 2 === 0) { ctx.fillStyle = '#0c1a28'; ctx.fillRect(left, y, canvas.width - 160, rowH); }
    columns.forEach(([, key], i) => drawText(ctx, clean(day[key]), left + i * colW + colW / 2, y + rowH / 2, { size: 18, align: 'center' }));
  });
  drawText(ctx, 'B = Begins · J = Jama‘ah', 120, canvas.height - 72, { size: 22, color: '#9fb0be' });
  saveCanvas(canvas, `JIC-${currentMonth.replace(/\s+/g,'-')}-prayer-timetable.jpg`);
};

const exportWallpaper = (monthlyPrayerTimes, currentMonth) => {
  if (!monthlyPrayerTimes?.length) return;
  const canvas = document.createElement('canvas');
  canvas.width = 1440; canvas.height = 2560;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#07111b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#dcb650'; ctx.fillRect(0, 0, canvas.width, 20);
  drawText(ctx, 'JAMATIA ISLAMIC CENTRE', 720, 120, { size: 28, weight: 700, align: 'center', color: '#dcb650' });
  drawText(ctx, currentMonth, 720, 190, { size: 60, weight: 750, align: 'center' });
  drawText(ctx, 'Jama‘ah timetable · Birmingham', 720, 250, { size: 25, align: 'center', color: '#b8c4cf' });

  const columns = [['Date','d_date'],['Fajr','fajr_jamah'],['Dhuhr','zuhr_jamah'],['Asr','asr_jamah'],['Maghrib','maghrib_jamah'],['Isha','isha_jamah']];
  const left = 60, top = 350, rowH = 62, colW = (canvas.width - 120) / columns.length;
  ctx.fillStyle = '#102235'; ctx.fillRect(left, top, canvas.width - 120, rowH);
  columns.forEach(([label], i) => drawText(ctx, label, left + i * colW + colW / 2, top + rowH / 2, { size: 23, weight: 700, align: 'center', color: '#dcb650' }));
  monthlyPrayerTimes.forEach((day, row) => {
    const y = top + rowH * (row + 1);
    if (row % 2 === 0) { ctx.fillStyle = '#0c1a28'; ctx.fillRect(left, y, canvas.width - 120, rowH); }
    columns.forEach(([, key], i) => {
      const fallback = key.endsWith('_jamah') ? day[key.replace('_jamah','_begins')] : day[key];
      drawText(ctx, clean(day[key] || fallback), left + i * colW + colW / 2, y + rowH / 2, { size: 22, align: 'center' });
    });
  });
  drawText(ctx, 'Save as your phone wallpaper for quick access', 720, 2415, { size: 25, align: 'center', color: '#9fb0be' });
  drawText(ctx, 'jicmasjid.org', 720, 2475, { size: 24, weight: 650, align: 'center', color: '#dcb650' });
  saveCanvas(canvas, `JIC-${currentMonth.replace(/\s+/g,'-')}-phone-wallpaper.jpg`);
};

export const MonthlyPrayerTable = ({ monthlyPrayerTimes, currentMonth, currentDate }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden">
    <div className="bg-primary text-white px-4 py-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">Monthly schedule</p><h3 className="text-lg sm:text-xl font-bold">{currentMonth} Prayer Times</h3></div>
        {monthlyPrayerTimes.length > 0 && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportFullTimetable(monthlyPrayerTimes,currentMonth)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/30 bg-black/15 px-3 py-2 text-xs font-semibold hover:bg-black/25"><Download size={15}/>Download JPEG</button>
          <button type="button" onClick={() => exportWallpaper(monthlyPrayerTimes,currentMonth)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/30 bg-black/15 px-3 py-2 text-xs font-semibold hover:bg-black/25"><Smartphone size={15}/>Phone wallpaper</button>
        </div>}
      </div>
    </div>
    {monthlyPrayerTimes.length===0 && <p className="p-6 text-center">This month’s timetable has not been uploaded yet. Please contact the centre.</p>}
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[1000px]">
        <thead><tr className="bg-gray-100 dark:bg-gray-600">
          <th className="p-3 text-left text-xs sm:text-sm">Day</th><th className="p-3 text-left text-xs sm:text-sm">Date</th><th className="p-3 text-left text-xs sm:text-sm">Fajr Begins</th><th className="p-3 text-left text-xs sm:text-sm">Fajr Jama'ah</th><th className="p-3 text-left text-xs sm:text-sm">Sunrise</th><th className="p-3 text-left text-xs sm:text-sm">Dhuhr Begins</th><th className="p-3 text-left text-xs sm:text-sm">Dhuhr Jama'ah</th><th className="p-3 text-left text-xs sm:text-sm">Asr Begins</th><th className="p-3 text-left text-xs sm:text-sm">Asr Jama'ah</th><th className="p-3 text-left text-xs sm:text-sm">Maghrib Begins</th><th className="p-3 text-left text-xs sm:text-sm">Maghrib Jama'ah</th><th className="p-3 text-left text-xs sm:text-sm">Isha Begins</th><th className="p-3 text-left text-xs sm:text-sm">Isha Jama'ah</th>
        </tr></thead>
        <tbody>{monthlyPrayerTimes.map((dayData,index)=><tr key={index} className={`border-b border-gray-200 dark:border-gray-600 text-xs sm:text-sm ${dayData.day===currentDate.getDate()?'bg-primary/10':index%2===0?'bg-gray-50 dark:bg-gray-800':''}`}>
          <td className="p-3 font-medium">{dayData.day}</td><td className="p-3">{dayData.d_date}</td><td className="p-3">{dayData.fajr_begins}</td><td className="p-3">{dayData.fajr_jamah}</td><td className="p-3">{dayData.sunrise}</td><td className="p-3">{dayData.zuhr_begins}</td><td className="p-3">{dayData.zuhr_jamah}</td><td className="p-3">{dayData.asr_begins}</td><td className="p-3">{dayData.asr_jamah}</td><td className="p-3">{dayData.maghrib_begins}</td><td className="p-3">{dayData.maghrib_jamah}</td><td className="p-3">{dayData.isha_begins}</td><td className="p-3">{dayData.isha_jamah}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </motion.div>
);

export const JummahTimesCard=({jummahTimes})=><motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.35}} className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto"><div className="bg-primary text-white px-4 py-3 text-center"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">Every Friday</p><h3 className="text-lg sm:text-xl font-bold">Jummah Prayer Times</h3></div><div className="p-4 sm:p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">{jummahTimes.map((jummah,index)=><Card key={index} className="border-t-4 border-t-primary"><CardContent className="pt-5 sm:pt-6"><h4 className="text-lg sm:text-xl font-bold mb-4">{jummah.name}</h4><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Khutbah:</span><span className="font-semibold">{jummah.khutbah}</span></div><div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Jama'ah:</span><span className="font-semibold">{jummah.prayer}</span></div></div></CardContent></Card>)}</div><div className="mt-5 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg text-center"><p className="text-sm text-gray-600 dark:text-gray-300">Please arrive early for the khutbah.</p></div></div></motion.div>;

export const RamadanTimesTable=({ramadanTimes})=><motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.35}} className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"><div className="bg-primary text-white p-4 text-center"><h3 className="text-xl font-bold">Ramadan Prayer Times</h3></div><div className="p-6"><div className="mb-6 p-4 bg-gray-50 dark:bg-gray-600 rounded-lg text-center"><p className="text-gray-600 dark:text-gray-300">Ramadan prayer times will be updated closer to the holy month.</p></div>{ramadanTimes&&ramadanTimes.length>0?<><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-gray-100 dark:bg-gray-600"><th className="p-3 text-left">Day</th><th className="p-3 text-left">Suhoor Ends</th><th className="p-3 text-left">Iftar Time</th><th className="p-3 text-left">Taraweeh</th></tr></thead><tbody>{ramadanTimes.map((day,index)=><tr key={index} className={`border-b border-gray-200 dark:border-gray-600 ${index%2===0?'bg-gray-50 dark:bg-gray-800':''}`}><td className="p-3 font-medium">{day.day}</td><td className="p-3">{day.suhoor}</td><td className="p-3">{day.iftar}</td><td className="p-3">{day.taraweeh}</td></tr>)}</tbody></table></div></>:<p className="text-center text-gray-600 dark:text-gray-300 py-8">No specific Ramadan schedule active for the current view.</p>}</div></motion.div>;

export default function PrayerScheduleTabs({ monthlyPrayerTimes,currentMonth,currentDate,jummahTimes,ramadanTimes,activeTab,setActiveTab }){
  const contentRef=useRef(null);
  const handleTab=(value)=>{
    setActiveTab(value);
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      if(!contentRef.current)return;
      const headerOffset=220;
      const top=contentRef.current.getBoundingClientRect().top+window.scrollY-headerOffset;
      window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
    }));
  };
  return <section id="prayer-schedule" className="py-16 bg-gray-50 dark:bg-gray-800 scroll-mt-56">
    <div className="container mx-auto px-4">
      <Tabs value={activeTab} onValueChange={handleTab} className="w-full max-w-6xl mx-auto">
        <div className="sticky top-[188px] z-20 flex justify-center mb-6 sm:top-[204px]"><TabsList className="grid grid-cols-3 w-full max-w-md shadow-lg backdrop-blur-xl"><TabsTrigger value="daily">Monthly</TabsTrigger><TabsTrigger value="jummah">Jummah</TabsTrigger><TabsTrigger value="ramadan">Ramadan</TabsTrigger></TabsList></div>
        <div ref={contentRef} className="scroll-mt-56">
          <TabsContent value="daily" className="space-y-8">{activeTab==='daily'&&<MonthlyPrayerTable monthlyPrayerTimes={monthlyPrayerTimes} currentMonth={currentMonth} currentDate={currentDate}/>}</TabsContent>
          <TabsContent value="jummah" className="space-y-8">{activeTab==='jummah'&&<JummahTimesCard jummahTimes={jummahTimes}/>}</TabsContent>
          <TabsContent value="ramadan" className="space-y-8">{activeTab==='ramadan'&&<RamadanTimesTable ramadanTimes={ramadanTimes}/>}</TabsContent>
        </div>
      </Tabs>
    </div>
  </section>;
}
