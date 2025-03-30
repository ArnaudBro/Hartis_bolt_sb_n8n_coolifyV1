import { supabase } from './supabase';

export interface Report {
  id: string;
  user_id: string;
  date: string;
  transcripts: string | null;
  ai_title: string | null;
  ai_report: string | null;
  user_title: string | null;
  user_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'user_title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export class ReportsEngine {
  static async listReports(filters: ReportFilters = {}): Promise<{
    data: Report[];
    count: number;
  }> {
    try {
      let query = supabase
        .from('reports')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('user_title', `%${filters.search}%`);
      }

      // Apply date range filters
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      // Apply sorting
      query = query.order(
        filters.sortBy || 'created_at',
        {
          ascending: filters.sortOrder === 'asc',
          nullsFirst: false
        }
      );

      // Apply pagination
      if (filters.page !== undefined && filters.perPage !== undefined) {
        const from = filters.page * filters.perPage;
        const to = from + filters.perPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: (data as Report[]) || [],
        count: count || 0
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  static async getReport(id: string): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data as Report;
  }

  static async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    // Ensure we only update user_title and user_report
    const { user_title, user_report } = updates;
    
    const { data, error } = await supabase
      .from('reports')
      .update({ 
        user_title, 
        user_report,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Report;
  }
}