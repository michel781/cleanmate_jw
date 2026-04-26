import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/types/app';

type Client = SupabaseClient;

export async function listTasks(supabase: Client, partyId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('party_id', partyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export interface CreateTaskInput {
  name: string;
  emoji?: string;
  cycle?: number;
  weight?: number;
  assigned_to?: string | null;
}

export async function createTask(
  supabase: Client,
  partyId: string,
  input: CreateTaskInput
): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      party_id: partyId,
      name: input.name,
      emoji: input.emoji ?? '🧹',
      cycle: input.cycle ?? 7,
      weight: input.weight ?? 10,
      assigned_to: input.assigned_to ?? null,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Log activity
  await supabase.from('activity').insert({
    party_id: partyId,
    type: 'task_added',
    actor_id: user?.id,
    target_id: data.id,
    metadata: { task_name: data.name, emoji: data.emoji },
  });

  return data as Task;
}

export async function updateTask(
  supabase: Client,
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(supabase: Client, taskId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;

  if (task && user) {
    await supabase.from('activity').insert({
      party_id: task.party_id,
      type: 'task_deleted',
      actor_id: user.id,
      metadata: { task_name: task.name, emoji: task.emoji },
    });
  }
}
