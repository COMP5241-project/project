import { createClient } from '@supabase/supabase-js';

const logoutButton = document.querySelector('#logout-button');
const feedback = document.querySelector('#logout-feedback');
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

logoutButton.addEventListener('click', async () => {
  feedback.classList.add('hidden');

  if (!supabase) {
    feedback.textContent = 'Logout is unavailable because the Supabase connection is not configured.';
    feedback.classList.remove('hidden');
    return;
  }

  logoutButton.disabled = true;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    window.location.assign('/index.html');
  } catch (error) {
    feedback.textContent = error.message || 'Logout failed. Please try again.';
    feedback.classList.remove('hidden');
    logoutButton.disabled = false;
  }
});
