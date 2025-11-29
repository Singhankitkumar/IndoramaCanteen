import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUpWithOTP: (email: string, fullName: string, employeeId: string) => Promise<void>;
  verifyOTPAndCreateAccount: (email: string, token: string, password: string, fullName: string, employeeId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetOTP: (email: string) => Promise<void>;
  resetPasswordWithOTP: (email: string, token: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithOTP = async (email: string, fullName: string, employeeId: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName,
          employee_id: employeeId,
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;
  };

  const verifyOTPAndCreateAccount = async (
    email: string,
    token: string,
    password: string,
    fullName: string,
    employeeId: string
  ) => {
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) throw verifyError;

    if (!verifyData.user) {
      throw new Error('User verification failed');
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) throw updateError;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', verifyData.user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: verifyData.user.id,
        email,
        full_name: fullName,
        employee_id: employeeId,
        is_admin: false,
      });

      if (profileError) {
        if (profileError.code === '23505') {
          throw new Error('This employee ID is already registered. Please use a different employee ID.');
        }
        throw profileError;
      }
    }

    await supabase.auth.signOut();
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const sendPasswordResetOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;
  };

  const resetPasswordWithOTP = async (email: string, token: string, newPassword: string) => {
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) throw verifyError;

    if (!verifyData.user) {
      throw new Error('User verification failed');
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;

    await supabase.auth.signOut();
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUpWithOTP,
        verifyOTPAndCreateAccount,
        signIn,
        signOut,
        sendPasswordResetOTP,
        resetPasswordWithOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
