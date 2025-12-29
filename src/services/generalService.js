import { apiInterceptor } from './api.js';
import { supabase } from '@/supabase';

export const generalService = {
  async incrementDailyVisits() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await apiInterceptor(
      supabase
        .from('daily_visits')
        .upsert({
          date: today,
          count: 1
        }, {
          onConflict: 'date',
          ignoreDuplicates: false
        })
        .select()
    );

    if (!error && data) {
      // If record exists, increment counter
      await apiInterceptor(
        supabase
          .from('daily_visits')
          .update({ count: (data[0]?.count || 0) + 1 })
          .eq('date', today)
      );
    }

    return { error };
  }
};

export default generalService;
