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

  // Manda a foto do prato pra Edge Function (analyze-meal-photo), que chama a API da Anthropic
  // com a chave guardada só no servidor — a chave nunca passa pelo navegador.
  async function analyzeMealPhoto(imageBase64, mediaType){
    const c = getClient();
    if(!c) throw new Error('Supabase não configurado.');
    const { data, error } = await c.functions.invoke('analyze-meal-photo', { body: { imageBase64, mediaType } });
    if(error){
      // começa com o que o próprio supabase-js já sabe (ex: função não encontrada, erro de rede) —
      // só sobrescreve se conseguir ler um corpo de erro mais específico da função ou do gateway.
      let msg = error.message || 'Não foi possível analisar a foto.';
      try{
        const errBody = await error.context.json();
        if(errBody && (errBody.error || errBody.message)) msg = errBody.error || errBody.message;
      }catch(e){}
      throw new Error(msg);
    }
    return data;
  }

  let saveTimer = null;
  let pendingState = null;
  async function flushSave(){
    if(pendingState == null) return;
    const c = getClient();
    if(!c || !currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const toSave = pendingState;
    pendingState = null;
    const { error } = await c.from('app_state').upsert({
      user_id: currentUser.id,
      data: toSave,
      updated_at: new Date().toISOString(),
    });
    if(error) console.error('saveRemoteState', error);
  }
  function saveRemoteState(stateObj){
    const c = getClient();
    if(!c || !currentUser) return;
    pendingState = stateObj;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  }
  // Em celulares, sair do app (ex: ir pro menu de "Adicionar à Tela de Início")
  // pode acontecer antes do debounce acima completar — então força o envio
  // imediato do que estiver pendente assim que a página for ocultada/fechada.
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden') flushSave();
  });
  window.addEventListener('pagehide', () => { flushSave(); });

  function isConfigured(){ return !!getClient(); }
  function getCurrentUser(){ return currentUser; }

  return { getSession, onAuthChange, signUp, signIn, signOut, loadRemoteState, saveRemoteState, flushSave, isConfigured, getCurrentUser, analyzeMealPhoto };
})();
