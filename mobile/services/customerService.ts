/**
 * customerService — Customer data access layer.
 * Wraps Supabase queries for the customers table: list, get, create, update.
 * All operations are scoped to the authenticated user via RLS.
 */
import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export async function getCustomers(
  userId: string,
  options: {
    search?: string;
    filter?: 'all' | 'recent' | 'hot_leads';
    limit?: number;
    offset?: number;
  } = {}
): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('last_interaction', { ascending: false, nullsFirst: false });

  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,phone_number.ilike.%${options.search}%`
    );
  }

  if (options.filter === 'recent') {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('last_interaction', threeDaysAgo);
  } else if (options.filter === 'hot_leads') {
    query = query.contains('variables', { tags: ['hot_lead'] });
  }

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Customer[]) || [];
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'created_at' | 'interaction_count'>
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...customer, interaction_count: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}
