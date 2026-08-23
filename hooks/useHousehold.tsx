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

type HouseholdMemberRow = {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const displayNameFromEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return local || null;
};

export const [HouseholdProvider, useHousehold] = createContextHook(() => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureCurrentProfile = useCallback(async () => {
    if (!user || user.id === 'guest') return;

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.picture,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      console.error('Error ensuring current user profile:', upsertError);
    }
  }, [user, ensureCurrentProfile]);

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
      await ensureCurrentProfile();

      // Check for stored active household
      const storedId = await AsyncStorage.getItem(ACTIVE_HOUSEHOLD_KEY);

      // Find all households the user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id);

      if (memErr) {
        console.error('Household membership query failed for user:', user.id, memErr);
        const message = memErr.message || 'Failed to query household memberships';
        throw new Error(message);
      }

      if (!memberships || memberships.length === 0) {
        await AsyncStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
        setHousehold(null);
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Use stored household only if it is still valid for this user.
      let targetId = storedId && memberships.some(m => m.household_id === storedId)
        ? storedId
        : null;

      if (!targetId) {
        targetId = memberships[0].household_id;
      }

      let loadedHousehold = await loadHouseholdData(targetId);

      if (!loadedHousehold) {
        for (const membership of memberships) {
          const candidateId = membership.household_id;
          if (!candidateId) continue;
          const candidateHousehold = await loadHouseholdData(candidateId);
          if (candidateHousehold) {
            loadedHousehold = candidateHousehold;
            targetId = candidateId;
            break;
          }
        }
      }

      if (!loadedHousehold) {
        await AsyncStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
        setHousehold(null);
        setMembers([]);
        setError('Failed to load household');
        return;
      }

      await loadMembers(targetId);
      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, targetId);
    } catch (err) {
      console.error('Error loading household:', err);
      const fallback = `Failed to load household for user ${user?.id ?? 'unknown'}`;
      setError(err instanceof Error ? err.message || fallback : fallback);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  

  const loadHouseholdData = useCallback(async (householdId: string): Promise<Household | null> => {
    const { data, error: err } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();

    if (err) {
      console.error('Error loading household data:', err);
      return null;
    }

    const nextHousehold = data as Household;
    setHousehold(nextHousehold);
    return nextHousehold;
  }, []);

  const loadMembers = useCallback(async (householdId: string) => {
    const { data, error: err } = await supabase
      .from('household_members')
      .select('id, household_id, user_id, role, joined_at')
      .eq('household_id', householdId)
      .order('joined_at', { ascending: true });

    if (err) {
      console.error('Error loading members:', err);
      return;
    }

    const memberRows = (data || []) as HouseholdMemberRow[];
    const userIds = Array.from(new Set(memberRows.map(member => member.user_id).filter(Boolean)));

    let profilesById: Record<string, ProfileRow> = {};
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading member profiles:', profilesError);
      } else {
        profilesById = ((profilesData || []) as ProfileRow[]).reduce<Record<string, ProfileRow>>((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    const formattedMembers: HouseholdMember[] = memberRows.map((member, index) => {
      const profile = profilesById[member.user_id];
      const isCurrentUser = member.user_id === user?.id;
      const email = profile?.email ?? (isCurrentUser ? (user?.email ?? null) : null);
      const name =
        profile?.name ??
        (isCurrentUser ? (user?.name ?? null) : null) ??
        displayNameFromEmail(email) ??
        `Member ${index + 1}`;

      return {
        id: member.id,
        household_id: member.household_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: {
          name,
          email,
          avatar_url: profile?.avatar_url ?? null,
        },
      };
    });

    setMembers(formattedMembers);
  }, [user?.email, user?.id, user?.name]);

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
      setError(null);
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
          setError(null);
        } else {
          throw memberErr;
        }
      }

      await AsyncStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdData.id);
      setError(null);
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
