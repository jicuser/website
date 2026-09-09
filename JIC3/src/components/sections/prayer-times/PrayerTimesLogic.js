import { useState, useEffect, useMemo } from 'react';
    import { supabase } from '@/lib/supabaseClient';
    import { useToast } from '@/components/ui/use-toast';

    const formatTime = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return 'N/A';
      const parts = timeString.split(':');
      if (parts.length < 2) return 'N/A';
      const [hours, minutes] = parts;
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };
    
    export const usePrayerTimes = () => {
      const { toast } = useToast();
      const [currentDate, setCurrentDate] = useState(new Date());
      const [monthlyPrayerTimes, setMonthlyPrayerTimes] = useState([]);
      const [isLoading, setIsLoading] = useState(true);
      const [todaysTimes, setTodaysTimes] = useState(null);

      useEffect(() => {
        const timer = setInterval(() => {
          setCurrentDate(new Date());
        }, 1000 * 60); // Update every minute
        return () => clearInterval(timer);
      }, []);

      const currentMonthNumber = useMemo(() => currentDate.getMonth() + 1, [currentDate]);
      const currentYear = useMemo(() => currentDate.getFullYear(), [currentDate]);
      const currentDay = useMemo(() => currentDate.getDate(), [currentDate]);

      useEffect(() => {
        const fetchPrayerTimes = async () => {
          setIsLoading(true);
          setTodaysTimes(null); // Reset today's times before fetching
          setMonthlyPrayerTimes([]); // Reset monthly times before fetching
          
          const dateToQuery = `${currentYear}-${String(currentMonthNumber).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

          try {
            const { data: todayData, error: todayError } = await supabase
              .from('prayer_times')
              .select('*')
              .eq('d_date', dateToQuery)
              .maybeSingle();

            if (todayError) { 
              console.error("Error fetching today's prayer times:", todayError);
              toast({
                title: "Error Fetching Today's Times",
                description: todayError.message || "Could not fetch today's prayer times.",
                variant: "destructive",
              });
            } else if (todayData) {
              setTodaysTimes({
                fajr: formatTime(todayData.fajr_begins),
                sunrise: formatTime(todayData.sunrise),
                dhuhr: formatTime(todayData.zuhr_begins),
                asr: formatTime(todayData.asr_begins),
                maghrib: formatTime(todayData.maghrib_begins),
                isha: formatTime(todayData.isha_begins),
                jamaah_fajr: formatTime(todayData.fajr_jamah),
                jamaah_dhuhr: formatTime(todayData.zuhr_jamah),
                jamaah_asr: formatTime(todayData.asr_jamah),
                jamaah_maghrib: formatTime(todayData.maghrib_jamah),
                jamaah_isha: formatTime(todayData.isha_jamah),
                is_ramadan: todayData.is_ramadan,
                jummah_1_start: formatTime(todayData.jummah_1_start),
                jummah_1_jamah: formatTime(todayData.jummah_1_jamah),
                jummah_2_start: formatTime(todayData.jummah_2_begins),
                jummah_2_jamah: formatTime(todayData.jummah_2_jamah),
              });
            } else {
               // No data for today, which is fine, setTodaysTimes(null) is already done.
            }

            const firstDayOfMonth = new Date(currentYear, currentMonthNumber - 1, 1).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(currentYear, currentMonthNumber, 0).toISOString().split('T')[0];

            const { data: monthData, error: monthError } = await supabase
              .from('prayer_times')
              .select('*')
              .gte('d_date', firstDayOfMonth)
              .lte('d_date', lastDayOfMonth)
              .order('d_date', { ascending: true });

            if (monthError) {
              console.error('Error fetching monthly prayer times:', monthError);
              toast({
                title: "Error Fetching Monthly Times",
                description: monthError.message || "Could not fetch monthly prayer times.",
                variant: "destructive",
              });
            } else if (monthData) {
              const formattedData = monthData.map(pt => {
                const dateObj = new Date(pt.d_date + 'T00:00:00'); // Ensure correct date parsing
                return {
                  d_date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                  day: dateObj.getDate(),
                  dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
                  fajr_begins: formatTime(pt.fajr_begins),
                  fajr_jamah: formatTime(pt.fajr_jamah),
                  sunrise: formatTime(pt.sunrise),
                  zuhr_begins: formatTime(pt.zuhr_begins),
                  zuhr_jamah: formatTime(pt.zuhr_jamah),
                  asr_begins: formatTime(pt.asr_begins),
                  asr_jamah: formatTime(pt.asr_jamah),
                  maghrib_begins: formatTime(pt.maghrib_begins),
                  maghrib_jamah: formatTime(pt.maghrib_jamah),
                  isha_begins: formatTime(pt.isha_begins),
                  isha_jamah: formatTime(pt.isha_jamah),
                  is_ramadan: pt.is_ramadan,
                };
              });
              setMonthlyPrayerTimes(formattedData);
            }
          } catch (error) {
            console.error("Unexpected error in fetchPrayerTimes:", error);
            toast({
              title: "Unexpected Error",
              description: "An unexpected error occurred while fetching prayer times.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        };

        fetchPrayerTimes();
      }, [currentYear, currentMonthNumber, currentDay, toast]);
      
      const formattedDate = useMemo(() => currentDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }), [currentDate]);
      
      const formattedTime = useMemo(() => currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }), [currentDate]);

      const currentMonthName = useMemo(() => currentDate.toLocaleDateString('en-US', { month: 'long' }), [currentDate]);
      
      const jummahTimes = useMemo(() => {
        if (!todaysTimes || todaysTimes.jummah_1_start === 'N/A') return [];
        const times = [{ name: 'First Jummah', khutbah: todaysTimes.jummah_1_start, prayer: todaysTimes.jummah_1_jamah }];
        if (todaysTimes.jummah_2_start !== 'N/A') {
          times.push({ name: 'Second Jummah', khutbah: todaysTimes.jummah_2_start, prayer: todaysTimes.jummah_2_jamah });
        }
        return times;
      }, [todaysTimes]);

      const ramadanTimes = useMemo(() => {
        if (!todaysTimes?.is_ramadan || monthlyPrayerTimes.length === 0) return [];
        return monthlyPrayerTimes
          .filter(pt => pt.is_ramadan)
          .map(pt => ({
            day: pt.day,
            date: pt.d_date,
            suhoor: pt.fajr_begins,
            iftar: pt.maghrib_begins,
            taraweeh: null,
          }));
      }, [todaysTimes, monthlyPrayerTimes]);

      return {
        currentDate,
        formattedDate,
        formattedTime,
        currentMonth: currentMonthName,
        monthlyPrayerTimes,
        todaysTimes,
        jummahTimes,
        ramadanTimes,
        isLoadingPrayerTimes: isLoading,
      };
    };