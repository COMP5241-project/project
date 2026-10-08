import { createClient } from '@supabase/supabase-js';
import './styles.css';

const form = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const feedback = document.querySelector('#feedback');
const submitButton = document.querySelector('#submit-button');
const submitSpinner = document.querySelector('#submit-spinner');
const submitLabel = document.querySelector('#submit-label');

function showFeedback(message, type = 'error') {
  feedback.textContent = message;
  feedback.className = 'mb-5 rounded-md border px-4 py-3 text-sm';
  feedback.classList.add(
    ...(type === 'error'
      ? ['border-red-200', 'bg-red-50', 'text-red-800']
      : ['border-emerald-200', 'bg-emerald-50', 'text-emerald-800']),
  );
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitSpinner.classList.toggle('hidden', !isLoading);
  submitLabel.textContent = isLoading ? 'Signing in…' : 'Sign In';
}

function getConnectionMessage(error) {
  const message = error?.message?.toLowerCase() ?? '';
  if (
    !navigator.onLine ||
    error?.name === 'AuthRetryableFetchError' ||
    ['failed to fetch', 'fetch failed', 'networkerror'].some((text) => message.includes(text))
  ) {
    return 'Unable to connect to the sign-in service. Check your internet connection and try again.';
  }
  return null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  showFeedback('The sign-in service is not configured. Check the Supabase environment variables.');
  submitButton.disabled = true;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.classList.add('hidden');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      if (authError) {
        const connectionMessage = getConnectionMessage(authError);
        if (connectionMessage) throw new Error(connectionMessage);
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Incorrect email or password. Check your credentials and try again.');
        }
        throw new Error('Sign-in failed. Please try again later.');
      }

      const userId = authData.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, cs_qualified')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          throw new Error('Your account role information could not be found. Contact the system administrator.');
        }
        const connectionMessage = getConnectionMessage(profileError);
        if (connectionMessage) throw new Error(connectionMessage);
        throw new Error('Signed in, but unable to retrieve your account role. Check the database configuration and try again.');
      }

      if (profile.role === 'student') {
        window.location.assign(profile.cs_qualified === true ? '/student-cs.html' : '/student.html');
      } else if (profile.role === 'instructor') {
        window.location.assign('/instructor.html');
      } else {
        throw new Error('Your account role is not set or is unsupported. Contact the system administrator.');
      }
    } catch (error) {
      showFeedback(error.message || 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  });
}