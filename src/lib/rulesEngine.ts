import { supabase } from './supabase';

export interface Rule {
  id: string;
  user_id: string;
  contents: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RuleFilters {
  search?: string;
  sortBy?: 'contents' | 'created_at' | 'updated_at' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export class RulesEngine {
  static async listRules(filters: RuleFilters = {}): Promise<Rule[]> {
    let query = supabase
      .from('rules')
      .select('*')
      .eq('status', true)
      .order(filters.sortBy || 'created_at', {
        ascending: filters.sortOrder === 'asc',
      });

    if (filters.search) {
      query = query.ilike('contents', `%${filters.search}%`);
    }

    if (filters.page && filters.perPage) {
      const from = (filters.page - 1) * filters.perPage;
      const to = from + filters.perPage - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list rules: ${error.message}`);
    }

    return data as Rule[];
  }

  static async saveRule(rule: Partial<Rule>): Promise<Rule> {
    const { data, error } = await supabase
      .from('rules')
      .insert([{ ...rule, status: true }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save rule: ${error.message}`);
    }

    return data as Rule;
  }

  static async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule> {
    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update rule: ${error.message}`);
    }

    return data as Rule;
  }

  static async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('rules')
      .update({ status: false })
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to delete rule: ${error.message}`);
    }
  }

  static async toggleRuleStatus(ruleId: string, status: boolean): Promise<Rule> {
    const { data, error } = await supabase
      .from('rules')
      .update({ status })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle rule status: ${error.message}`);
    }

    return data as Rule;
  }
}