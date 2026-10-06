import { createClient } from '@supabase/supabase-js';

const pythonEditor = document.querySelector('#python-editor');
const pythonLines = document.querySelector('#python-line-numbers');
const pythonOutput = document.querySelector('#python-output');
const roundOneStatus = document.querySelector('#round-one-status');
const roundTwoStatus = document.querySelector('#round-two-status');
const overallStatus = document.querySelector('#overall-status');
const completionBanner = document.querySelector('#completion-banner');
const envWarningBadge = document.querySelector('#env-warning-badge');
const gitignoreEditor = document.querySelector('#gitignore-editor');
const gitignoreLines = document.querySelector('#gitignore-line-numbers');
const gitTerminalOutput = document.querySelector('#git-terminal-output');
const diagnosticFeedback = document.querySelector('#diagnostic-feedback');
const proceedButton = document.querySelector('#proceed-button');

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let hasPassedRound = false;

function showDiagnosticFeedback(message, type = 'error') {
  diagnosticFeedback.textContent = message;
  diagnosticFeedback.className = 'mt-4 rounded-md border px-4 py-3 text-sm';
  diagnosticFeedback.classList.add(
    ...(type === 'error'
      ? ['border-red-200', 'bg-red-50', 'text-red-800']
      : ['border-emerald-200', 'bg-emerald-50', 'text-emerald-800']),
  );
}

function updateLineNumbers(editor, lineNumbers) {
  const lineCount = editor.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
}

async function saveQualification(qualified) {
  if (!supabase) {
    throw new Error('The learner hub service is not configured. Check the Supabase environment variables.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Unable to verify your account: ${authError.message}`);
  const user = authData.user;
  if (!user) throw new Error('Your session has expired. Sign in again before continuing.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({ cs_qualified: qualified })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();

  if (profileError) throw new Error(`Unable to save your qualification result: ${profileError.message}`);
  if (!profile) throw new Error('Your learner profile could not be found. Contact the system administrator.');
}

async function markRoundPassed(statusElement) {
  statusElement.textContent = 'PASSED';
  statusElement.className = 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800';
  overallStatus.textContent = 'Qualified';
  overallStatus.className = 'text-emerald-700';
  completionBanner.classList.remove('hidden');
  hasPassedRound = true;

  try {
    await saveQualification(true);
    showDiagnosticFeedback('Your CS qualification has been saved.', 'success');
  } catch (error) {
    showDiagnosticFeedback(error.message || 'Unable to save your qualification result. Please try again.');
  }
}

function markRoundFailed(statusElement) {
  statusElement.textContent = 'Not passed';
  statusElement.className = 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800';
}

pythonEditor.addEventListener('input', () => updateLineNumbers(pythonEditor, pythonLines));
gitignoreEditor.addEventListener('input', () => updateLineNumbers(gitignoreEditor, gitignoreLines));

document.querySelector('#run-python').addEventListener('click', () => {
  const code = pythonEditor.value;
  const hasHelloWorld = /['"]Hello World['"]/.test(code);
  const hasMessageBox = /(?:\bmessagebox|\b(?:tk|tkinter)\.messagebox)\s*\.\s*show(?:info|warning|error)\s*\(/.test(code);

  if (hasHelloWorld && hasMessageBox) {
    pythonOutput.textContent = "PASS: Found a tkinter message box call containing 'Hello World'. GUI execution is simulated in this browser.";
    pythonOutput.className = 'font-mono text-sm text-emerald-400';
    void markRoundPassed(roundOneStatus);
    return;
  }

  pythonOutput.textContent = "Not yet. Add a tkinter messagebox.showinfo (or showwarning/showerror) call containing 'Hello World'.";
  pythonOutput.className = 'font-mono text-sm text-amber-300';
  markRoundFailed(roundOneStatus);
});

document.querySelector('#commit-push').addEventListener('click', () => {
  const ignoreRules = gitignoreEditor.value;
  const protectsEnv = ['.env', '.env.local', '*.env', '.env*'].some((rule) => ignoreRules.includes(rule));

  if (protectsEnv) {
    gitTerminalOutput.textContent = '[SUCCESS] .env ignored. Commit successful!';
    gitTerminalOutput.className = 'text-emerald-400';
    envWarningBadge.classList.add('hidden');
    void markRoundPassed(roundTwoStatus);
    return;
  }

  gitTerminalOutput.textContent = '[ERROR] Secret file .env is still tracked by Git! Add .env to .gitignore.';
  gitTerminalOutput.className = 'text-red-300';
  markRoundFailed(roundTwoStatus);
});

proceedButton.addEventListener('click', async () => {
  diagnosticFeedback.classList.add('hidden');
  proceedButton.disabled = true;

  try {
    await saveQualification(hasPassedRound);
    window.location.assign(hasPassedRound ? '/student-cs.html' : '/student-non-cs.html');
  } catch (error) {
    showDiagnosticFeedback(error.message || 'Unable to continue. Please try again.');
    proceedButton.disabled = false;
  }
});
