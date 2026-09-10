import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

const clean = value => value && value !== 'N/A' ? String(value).replace(/^0/, '').replace(/\s?[AP]M$/i, '') : '—';

const saveCanvas = (canvas, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.96);
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

const roundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const exportWallpaper = (monthlyPrayerTimes, currentMonth) => {
  if (!monthlyPrayerTimes?.length) return;

  // 19.5:9 portrait canvas: suitable for current iPhone/Android home and lock screens.
  const canvas = document.createElement('canvas');
  canvas.width = 1290;
  canvas.height = 2796;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#05090e');
  bg.addColorStop(0.46, '#07131f');
  bg.addColorStop(1, '#03070b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft gold glow and understated mosque-arch motif.
  const glow = ctx.createRadialGradient(1040, 520, 30, 1040, 520, 640);
  glow.addColorStop(0, 'rgba(220,182,80,.18)');
  glow.addColorStop(1, 'rgba(220,182,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, 1180);

  ctx.strokeStyle = 'rgba(220,182,80,.10)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 740);
  ctx.quadraticCurveTo(645, 70, 1220, 740);
  ctx.stroke();

  // Leave the top ~300px quiet so lock-screen clock/widgets remain readable.
  drawText(ctx, 'JAMATIA ISLAMIC CENTRE', 645, 340, { size: 27, weight: 750, align: 'center', color: '#dfb650' });
  drawText(ctx, `${currentMonth} Prayer Times`, 645, 405, { size: 52, weight: 760, align: 'center', color: '#ffffff' });
  drawText(ctx, 'Birmingham · Begins & Jama‘ah', 645, 459, { size: 24, align: 'center', color: '#9eabb7' });

  const left = 46;
  const right = 46;
  const tableWidth = canvas.width - left - right;
  const top = 535;
  const headerH = 64;
  const rows = monthlyPrayerTimes.length;
  const availableRowsHeight = 2050;
  const rowH = Math.min(63, Math.floor(availableRowsHeight / Math.max(rows, 1)));
  const dateW = 142;
  const prayerW = (tableWidth - dateW) / 5;
  const prayers = [
    ['Fajr', 'fajr_begins', 'fajr_jamah'],
    ['Dhuhr', 'zuhr_begins', 'zuhr_jamah'],
    ['Asr', 'asr_begins', 'asr_jamah'],
    ['Maghrib', 'maghrib_begins', 'maghrib_jamah'],
    ['Isha', 'isha_begins', 'isha_jamah'],
  ];

  ctx.fillStyle = 'rgba(10,24,38,.94)';
  roundRect(ctx, left, top, tableWidth, headerH + rows * rowH + 18, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,182,80,.13)';
  roundRect(ctx, left + 8, top + 8, tableWidth - 16, headerH - 8, 20);
  ctx.fill();

  drawText(ctx, 'DATE', left + dateW / 2, top + headerH / 2 + 2, { size: 18, weight: 760, align: 'center', color: '#dfb650' });
  prayers.forEach(([label], index) => {
    drawText(ctx, label.toUpperCase(), left + dateW + prayerW * index + prayerW / 2, top + headerH / 2 + 2, { size: 18, weight: 760, align: 'center', color: '#dfb650' });
  });

  monthlyPrayerTimes.forEach((day, row) => {
    const y = top + headerH + row * rowH;
    if (row % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.fillRect(left + 10, y, tableWidth - 20, rowH);
    }

    ctx.strokeStyle = 'rgba(255,255,255,.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 18, y + rowH);
    ctx.lineTo(left + tableWidth - 18, y + rowH);
    ctx.stroke();

    const dateLabel = clean(day.d_date || day.day);
    drawText(ctx, dateLabel, left + dateW / 2, y + rowH / 2, { size: 19, weight: 650, align: 'center', color: '#f4f6f8' });

    prayers.forEach(([, beginsKey, jamahKey], index) => {
      const x = left + dateW + prayerW * index + prayerW / 2;
      drawText(ctx, `B ${clean(day[beginsKey])}`, x, y + rowH * 0.35, { size: 16, weight: 560, align: 'center', color: '#aeb8c2' });
      drawText(ctx, `J ${clean(day[jamahKey] || day[beginsKey])}`, x, y + rowH * 0.68, { size: 18, weight: 720, align: 'center', color: '#ffffff' });
    });
  });

  const footerY = Math.min(2660, top + headerH + rows * rowH + 82);
  drawText(ctx, 'B = Begins   ·   J = Jama‘ah', 645, footerY, { size: 20, align: 'center', color: '#8796a3' });
  drawText(ctx, 'jicmasjid.org', 645, footerY + 48, { size: 22, weight: 720, align: 'center', color: '#dfb650' });

  saveCanvas(canvas, `JIC-${currentMonth.replace(/\s+/g, '-')}-phone-wallpaper.jpg`);
};

export const MonthlyPrayerTable = ({ monthlyPrayerTimes, currentMonth, currentDate }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden">
    <div className="bg-primary text-white px-4 py-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">Monthly schedule</p><h3 className="text-lg sm:text-xl font-bold">{currentMonth} Prayer Times</h3></div>
        {monthlyPrayerTimes.length > 0 && <button type="button" onClick={() => exportWallpaper(monthlyPrayerTimes,currentMonth)} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-white/30 bg-black/15 px-3 py-2 text-xs font-semibold hover:bg-black/25"><Smartphone size={15}/>Download phone wallpaper</button>}
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
