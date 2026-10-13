/* ECHO Cloud: optional private, explicit sync. v3.1
   Frontend only has a Supabase PUBLISHABLE key. All data access is protected by RLS.
   This intentionally uses manual upload/download to avoid overwriting concurrent edits. */
(() => {
  'use strict';
  const KEY = 'controlled-drift-command-v2';
  const FIELDS = ['channel','youtube','customLabel','customUrl','tasks','nextTaskId',
    'talkingPoints','scratchPad','contentItems','promoItems','moments'];
  const byId = id => document.getElementById(id);
  const signIn = byId('cloudSignInActions');
  const signedIn = byId('cloudAccountActions');
  const emailButton = byId('cloudEmailButton');
  const uploadButton = byId('cloudUpload');
  const downloadButton = byId('cloudDownload');
  const logoutButton = byId('cloudSignOut');
  const status = byId('cloudState');
  const lastSync = byId('cloudLastSync');
  if (!status || !signIn || !signedIn) return;
  function report(message) { status.textContent = message; }
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    report('Cloud library unavailable. Local ECHO still works; check your network connection.');
    return;
  }
  const client = window.supabase.createClient(
    'https://xkghwqticokunxuqwyrh.supabase.co',
    "sb_publishable_n1wbErN9-MK8VtPMQgXgFw_KKIfFKEV",
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  let user = null;
  let busy = false;
  function showAccount() {
    signIn.hidden = !!user;
    signedIn.hidden = !user;
    report(user ? 'Signed in as '+(user.email || 'ECHO member') : 'Not signed in — this device currently saves data locally.');
    const old = localStorage.getItem('echo-last-cloud-operation');
    if(old) lastSync.textContent = old;
  }
  function setBusy(value) {
    busy = value;
    [emailButton, uploadButton, downloadButton, logoutButton].forEach(button => button.disabled = value);
  }
  function workspaceFromLocal() {
    let data;
    try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { data = {}; }
    const safe = {};
    for(const field of FIELDS) {
      if(Object.prototype.hasOwnProperty.call(data,field)) safe[field] = data[field];
    }
    return safe;
  }
  function remember(message) {
    const stamp = message+' · '+new Date().toLocaleString();
    localStorage.setItem('echo-last-cloud-operation',stamp);
    lastSync.textContent = stamp;
  }
  async function ensureUser() {
    const { data, error } = await client.auth.getUser();
    if(error || !data.user) {
      user=null; showAccount();
      throw new Error('Your cloud session expired. Sign in again.');
    }
    user=data.user; return user;
  }
  emailButton.addEventListener('click', async () => {
    if (busy) return;
    const email = byId('cloudEmail').value.trim();
    if(!byId('cloudEmail').checkValidity() || !email) {
      report('Enter a valid email address to receive your sign-in link.'); return;
    }
    if(location.protocol !== 'https:') {
      report('Sign-in links require the hosted HTTPS dashboard.'); return;
    }
    setBusy(true); report('Requesting sign-in link…');
    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: location.origin+location.pathname, shouldCreateUser: true }
      });
      if(error) throw error;
      report('Sign-in link requested. Check your email, then return to ECHO.');
    } catch(error) {
      report('Sign-in error: '+error.message+' — check Supabase Auth URL Configuration.');
    } finally { setBusy(false); }
  });
  uploadButton.addEventListener('click', async () => {
    if(busy) return;
    setBusy(true); report('Checking cloud copy…');
    try {
      const account = await ensureUser();
      const { data:existing,error:readError } = await client
        .from('echo_workspaces').select('updated_at').eq('user_id',account.id).maybeSingle();
      if(readError) throw readError;
      const question = existing
        ? 'A cloud copy exists (last uploaded '+new Date(existing.updated_at).toLocaleString()+'). Uploading this device replaces that cloud copy. Continue?'
        : 'Upload this device\'s notes, content, campaigns and stream rundown to your private ECHO cloud workspace?';
      if(!confirm(question)) { report('Upload canceled. Cloud copy unchanged.'); return; }
      const {error} = await client.from('echo_workspaces').upsert({
        user_id:account.id, data:workspaceFromLocal(), updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error) throw error;
      remember('Cloud upload completed');
      report('Cloud upload complete. On your other device, sign in and choose Restore cloud copy.');
    } catch(error) { report('Cloud upload failed: '+error.message); }
    finally { setBusy(false); }
  });
  downloadButton.addEventListener('click', async () => {
    if(busy) return;
    setBusy(true); report('Loading cloud copy…');
    try {
      const account=await ensureUser();
      const {data:row,error} = await client
        .from('echo_workspaces').select('data,updated_at').eq('user_id',account.id).maybeSingle();
      if(error) throw error;
      if(!row) { report('No cloud copy exists yet. Upload your data from the first device.'); return; }
      if(!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) throw new Error('Cloud copy format is invalid.');
      if(!confirm('Restore cloud copy from '+new Date(row.updated_at).toLocaleString()+
        '? This replaces local content, campaigns, notes, rundown and highlight log. Your local stream timer stays unchanged. Export a backup first if needed.')) {
        report('Restore canceled. Local data unchanged.'); return;
      }
      let current={};
      try { current=JSON.parse(localStorage.getItem(KEY)||'{}') || {}; } catch { current={}; }
      for(const field of FIELDS) {
        if(Object.prototype.hasOwnProperty.call(row.data,field)) current[field]=row.data[field];
      }
      localStorage.setItem(KEY,JSON.stringify(current));
      remember('Cloud restore completed');
      location.reload();
    } catch(error) { report('Cloud restore failed: '+error.message); }
    finally { setBusy(false); }
  });
  logoutButton.addEventListener('click', async () => {
    if(busy) return;
    setBusy(true);
    try {
      const {error}=await client.auth.signOut();
      if(error) throw error;
      user=null; showAccount();
    } catch(error){report('Sign-out error: '+error.message)}
    finally{setBusy(false)}
  });
  client.auth.onAuthStateChange((_event,session) => {
    user=session?.user || null;
    showAccount();
  });
  client.auth.getSession().then(({data,error}) => {
    if(error) {report('Could not restore cloud session: '+error.message);return}
    user=data.session?.user || null;
    showAccount();
  }).catch(error => report('Cloud connection error: '+error.message));
})();
