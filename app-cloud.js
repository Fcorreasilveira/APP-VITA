/* app-cloud.js — autenticação e sincronização com Supabase */
const AppCloud = (() => {
  let client = null;
  let currentUser = null;

  function getClient(){
    if(client) return client;
    if(typeof window.supabase === 'undefined') return null;
    if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY.includes('COLE_AQUI')){
      return null;
    }
    client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return client;
  }

  async function getSession(){
    const c = getClient();
    if(!c) return null;
    const { data } = await c.auth.getSession();
    currentUser = data.session ? data.session.user : null;
    return currentUser;
  }

  function onAuthChange(cb){
    const c = getClient();
    if(!c) return;
    c.auth.onAuthStateChange((_event, session) => {
      currentUser = session ? session.user : null;
      cb(currentUser);
    });
  }

  async function signUp(email, password){
    const c = getClient();
    if(!c) throw new Error('Supabase não configurado — preencha supabase-config.js');
    const { data, error } = await c.auth.signUp({ email, password });
    if(error) throw error;
    if(data.session) currentUser = data.session.user; // confirmação de e-mail desativada: já loga
    return { user: data.user, hasSession: !!data.session };
  }

  async function signIn(email, password){
    const c = getClient();
    if(!c) throw new Error('Supabase não configurado — preencha supabase-config.js');
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if(error) throw error;
    return data.user;
  }

  async function signOut(){
    const c = getClient();
    if(!c) return;
    await c.auth.signOut();
    currentUser = null;
  }

  async function loadRemoteState(){
    const c = getClient();
    if(!c || !currentUser) return null;
    const { data, error } = await c.from('app_state').select('data').eq('user_id', currentUser.id).maybeSingle();
    if(error){ console.error('loadRemoteState', error); return null; }
    return data ? data.data : null;
  }

  let saveTimer = null;
  function saveRemoteState(stateObj){
    const c = getClient();
    if(!c || !currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { error } = await c.from('app_state').upsert({
        user_id: currentUser.id,
        data: stateObj,
        updated_at: new Date().toISOString(),
      });
      if(error) console.error('saveRemoteState', error);
    }, 800);
  }

  function isConfigured(){ return !!getClient(); }
  function getCurrentUser(){ return currentUser; }

  return { getSession, onAuthChange, signUp, signIn, signOut, loadRemoteState, saveRemoteState, isConfigured, getCurrentUser };
})();
