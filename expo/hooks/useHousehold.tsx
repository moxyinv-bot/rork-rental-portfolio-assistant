import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

const ACTIVE_HOUSEHOLD_KEY = 'active_household_id';

export const [HouseholdProvider, useHousehold] = createContextHook(() => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load active household when user changes
  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }
    loadActiveHousehold();
  }, [user]);

  // Realtime subscription for household members
  useEffect(() => {
    if (!household) return;

    const channel = supabase
      .channel(`household-${household.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${household.id}` },
        () => { loadMembers(household.id); }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'households', filter: `id=eq.${household.id}` },
        () => { loadHouseholdData(household.id); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id]);

  const loadActiveHousehold = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);

      // Check for stored active household
      const storedId = await AsyncStorage.getItem(ACTIVE_HOUSEHOLD_KEY);

      // Find all households the user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id);

      if (memErr) throw memErr;

      if (!memberships || memberships.length === 0) {
        setHousehold(null);
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Use stored household if still valid, otherwise use the first one
      const targetId = storedId && memberships.some(m => m.household_id === storedId)
        ? storedId
        : memberships[0].household_id;

      await loadHouseholdData(targetId);
      await loadMembers(targetId);
      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, targetId);
    } catch (err) {
      console.error('Error loading household:', err);
      setError(err instanceof Error ? err.message : 'Failed to load household');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadHouseholdData = useCallback(async (householdId: string) => {
    const { data, error: err } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();

    if (err) {
      console.error('Error loading household data:', err);
      return;
    }
    setHousehold(data as Household);
  }, []);

  const loadMembers = useCallback(async (householdId: string) => {
    const { data, error: err } = await supabase
      .from('household_members')
      .select(`
        id,
        household_id,
        user_id,
        role,
        joined_at,
        profiles!inner(name, email, avatar_url)
      `)
      .eq('household_id', householdId)
      .order('joined_at', { ascending: true });

    if (err) {
      console.error('Error loading members:', err);
      return;
    }

    const formattedMembers: HouseholdMember[] = (data || []).map((m: any) => ({
      id: m.id,
      household_id: m.household_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: {
        name: m.profiles?.name ?? null,
        email: m.profiles?.email ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
      },
    }));

    setMembers(formattedMembers);
  }, []);

  const createHousehold = useCallback(async (name: string): Promise<Household | null> => {
    if (!user) return null;
    try {
      setError(null);

      const { data: householdData, error: createErr } = await supabase
        .from('households')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (createErr) throw createErr;

      const { error: memberErr } = await supabase
        .from('household_members')
        .insert({
          household_id: householdData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberErr) throw memberErr;

      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdData.id);
      setHousehold(householdData as Household);
      await loadMembers(householdData.id);
      return householdData as Household;
    } catch (err) {
      console.error('Error creating household:', err);
      setError(err instanceof Error ? err.message : 'Failed to create household');
      return null;
    }
  }, [user, loadMembers]);

  const joinHousehold = useCallback(async (inviteCode: string): Promise<Household | null> => {
    if (!user) return null;
    try {
      setError(null);

      const { data: householdData, error: findErr } = await supabase
        .from('households')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase().trim())
        .single();

      if (findErr) {
        setError('Invalid invite code');
        return null;
      }

      const { error: memberErr } = await supabase
        .from('household_members')
        .insert({
          household_id: householdData.id,
          user_id: user.id,
          role: 'member',
        });

      if (memberErr) {
        if (memberErr.code === '23505') {
          setError('You are already a member of this household');
        } else {
          throw memberErr;
        }
      }

      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdData.id);
      setHousehold(householdData as Household);
      await loadMembers(householdData.id);
      return householdData as Household;
    } catch (err) {
      console.error('Error joining household:', err);
      setError(err instanceof Error ? err.message : 'Failed to join household');
      return null;
    }
  }, [user, loadMembers]);

  const switchHousehold = useCallback(async (householdId: string): Promise<void> => {
    try {
      setError(null);
      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
      await loadHouseholdData(householdId);
      await loadMembers(householdId);
    } catch (err) {
      console.error('Error switching household:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch household');
    }
  }, [loadHouseholdData, loadMembers]);

  const leaveHousehold = useCallback(async (householdId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      setError(null);

      const { error: leaveErr } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user.id);

      if (leaveErr) throw leaveErr;

      // Reload to find another household or clear
      await loadActiveHousehold();
      return true;
    } catch (err) {
      console.error('Error leaving household:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave household');
      return false;
    }
  }, [user, loadActiveHousehold]);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: removeErr } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId);

      if (removeErr) throw removeErr;

      if (household) {
        await loadMembers(household.id);
      }
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      return false;
    }
  }, [household, loadMembers]);

  return {
    household,
    members,
    isLoading,
    error,
    createHousehold,
    joinHousehold,
    switchHousehold,
    leaveHousehold,
    removeMember,
    clearError: () => setError(null),
  };
});
