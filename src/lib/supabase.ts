// حل 1010 - كيخدم بلا Supabase
const createLocalClient = () => {
  const getUsers = () => {
    try { 
      const u = JSON.parse(localStorage.getItem('gdna_users') || 'null');
      if (u) return u;
    } catch {}
    // هادا هو الكونت ديال 1010
    const defaultUsers = [{ 
      id: '1010', 
      email: '222211wx@gmail.com', 
      username: 'El Qaisy Abdelmalik', 
      password: '12345678' 
    }];
    localStorage.setItem('gdna_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  };
  
  const saveUsers = (users: any) => localStorage.setItem('gdna_users', JSON.stringify(users));

  return {
    auth: {
      signInWithPassword: async ({ email, password }: any) => {
        const users = getUsers();
        const user = users.find((x: any) => (x.email === email || x.username === email) && x.password === password);
        if (!user) return { data: null, error: { message: 'الايميل ولا الباسورد غالط' } };
        localStorage.setItem('gdna_session', JSON.stringify(user));
        return { data: { user }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        const users = getUsers();
        if (users.find((x: any) => x.email === email)) {
          return { data: null, error: { message: 'هاد الايميل كاين already' } };
        }
        const newUser = { id: Date.now().toString(), email, username: options?.data?.username || email.split('@')[0], password };
        users.push(newUser);
        saveUsers(users);
        localStorage.setItem('gdna_session', JSON.stringify(newUser));
        return { data: { user: newUser }, error: null };
      },
      getSession: async () => {
        const s = localStorage.getItem('gdna_session');
        return { data: { session: s ? { user: JSON.parse(s) } : null } };
      },
      signOut: async () => {
        localStorage.removeItem('gdna_session');
        return { error: null };
      }
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), data: [], error: null }),
        data: [], error: null 
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
    })
  } as any;
};

export const supabase = createLocalClient();

export const isSupabaseConfigured = !!supabase;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.");
  }
  return supabase;
}
