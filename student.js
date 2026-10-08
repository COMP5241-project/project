import { createClient } from '@supabase/supabase-js';

const pythonEditor = document.querySelector('#python-editor');
const pythonLines = document.querySelector('#python-line-numbers');
const pythonOutput = document.querySelector('#python-output');
const roundOneStatus = document.querySelector('#round-one-status');
const roundTwoStatus = document.querySelector('#round-two-status');
const stepOneContainer = document.querySelector('#step-one-container');
const stepTwoContainer = document.querySelector('#step-two-container');
const stepOneIndicator = document.querySelector('#step-one-indicator');
const stepTwoIndicator = document.querySelector('#step-two-indicator');
const successModal = document.querySelector('#python-success-modal');
const diagnosticSteps = document.querySelector('#diagnostic-steps');
const assessmentSummary = document.querySelector('#assessment-summary');
const summaryFeedback = document.querySelector('#summary-feedback');
const roundOneResult = document.querySelector('#round-one-result');
const roundTwoResult = document.querySelector('#round-two-result');
const overallResultBanner = document.querySelector('#overall-result-banner');
const overallResultBadge = document.querySelector('#overall-result-badge');
const overallResultExplanation = document.querySelector('#overall-result-explanation');
const summaryAction = document.querySelector('#summary-action');
const envWarningBadge = document.querySelector('#env-warning-badge');
const gitignoreEditor = document.querySelector('#gitignore-editor');
const gitignoreLines = document.querySelector('#gitignore-line-numbers');
const gitTerminalOutput = document.querySelector('#git-terminal-output');
const commitButton = document.querySelector('#commit-push');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let round1Passed = false;
let round2Passed = false;
let round2Attempted = false;

function showFeedback(element, message, type = 'error') {
  element.textContent = message;
  element.className = 'mt-4 rounded-md border px-4 py-3 text-sm';
  element.classList.add(
    ...(type === 'error'
      ? ['border-red-200', 'bg-red-50', 'text-red-800']
      : ['border-emerald-200', 'bg-emerald-50', 'text-emerald-800']),
  );
}

function updateLineNumbers(editor, lineNumbers) {
  const lineCount = editor.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
}

async function saveQualification(isQualified) {
  if (!supabase) {
    throw new Error('The learner hub service is not configured. Check the Supabase environment variables.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Unable to verify your account: ${authError.message}`);
  const user = authData.user;
  if (!user) throw new Error('Your session has expired. Sign in again before continuing.');

  const { error } = await supabase
    .from('profiles')
    .update({ cs_qualified: isQualified, assessment_completed: true })
    .eq('id', user.id);

  if (error) throw new Error(`Unable to save your qualification result: ${error.message}`);
}

function advanceToStepTwo() {
  stepOneContainer.classList.add('hidden');
  stepTwoContainer.classList.remove('hidden');
  requestAnimationFrame(() => stepTwoContainer.classList.remove('opacity-0'));
  stepOneIndicator.classList.remove('border-2', 'border-[#A21942]', 'bg-red-50', 'text-[#A21942]');
  stepOneIndicator.classList.add('border', 'border-emerald-200', 'bg-emerald-50', 'text-emerald-800');
  stepOneIndicator.removeAttribute('aria-current');
  stepTwoIndicator.classList.remove('border', 'border-gray-200', 'bg-white', 'text-gray-500');
  stepTwoIndicator.classList.add('border-2', 'border-[#A21942]', 'bg-red-50', 'text-[#A21942]');
  stepTwoIndicator.setAttribute('aria-current', 'step');
  stepTwoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openPythonSuccessModal() {
  successModal.classList.remove('hidden');
  successModal.classList.add('flex');
  document.querySelector('#acknowledge-python').focus();
}

function updateRoundStatus(element, passed) {
  element.textContent = passed ? 'PASSED' : 'FAILED';
  element.className = passed
    ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800'
    : 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800';
}

function showAssessmentSummary() {
  const isQualified = round1Passed || round2Passed;

  roundOneResult.textContent = round1Passed ? 'PASSED ✅' : 'FAILED ❌';
  roundOneResult.className = round1Passed ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700';
  roundTwoResult.textContent = round2Passed ? 'PASSED ✅' : 'FAILED ❌';
  roundTwoResult.className = round2Passed ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700';

  if (isQualified) {
    overallResultBanner.className = 'mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-5';
    overallResultBadge.className = 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800';
    overallResultBadge.textContent = 'CS Qualified (Advanced Track)';
    overallResultExplanation.textContent = 'Congratulations! You passed at least one diagnostic round and qualify for the CS Track.';
    summaryAction.textContent = 'Proceed to CS Learner Hub';
  } else {
    overallResultBanner.className = 'mt-6 rounded-md border border-red-200 bg-red-50 p-5';
    overallResultBadge.className = 'inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800';
    overallResultBadge.textContent = 'Foundation Track Recommended';
    overallResultExplanation.textContent = 'You have been placed in the Foundation Track to strengthen your programming basics.';
    summaryAction.textContent = 'Proceed to Foundation Hub';
  }

  summaryAction.dataset.qualified = String(isQualified);
  diagnosticSteps.classList.add('hidden');
  stepOneContainer.classList.add('hidden');
  stepTwoContainer.classList.add('hidden');
  successModal.classList.add('hidden');
  successModal.classList.remove('flex');
  assessmentSummary.classList.remove('hidden');
  assessmentSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

pythonEditor.addEventListener('input', () => updateLineNumbers(pythonEditor, pythonLines));
gitignoreEditor.addEventListener('input', () => updateLineNumbers(gitignoreEditor, gitignoreLines));

document.querySelector('#run-python').addEventListener('click', () => {
  const code = pythonEditor.value;
  round1Passed = /Hello World/i.test(code) && /\b(?:messagebox|showinfo|print)\b/i.test(code);

  if (round1Passed) {
    pythonOutput.textContent = 'PASS: Your code includes a Hello World output call.';
    pythonOutput.className = 'font-mono text-sm text-emerald-400';
    updateRoundStatus(roundOneStatus, true);
    openPythonSuccessModal();
    return;
  }

  pythonOutput.textContent = 'Not yet. Include a messagebox, showinfo, or print call and the text "Hello World".';
  pythonOutput.className = 'font-mono text-sm text-amber-300';
  updateRoundStatus(roundOneStatus, false);
});

document.querySelector('#skip-step-one').addEventListener('click', () => {
  round1Passed = false;
  roundOneStatus.textContent = 'Skipped';
  roundOneStatus.className = 'rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600';
  advanceToStepTwo();
});

document.querySelector('#acknowledge-python').addEventListener('click', () => {
  successModal.classList.add('hidden');
  successModal.classList.remove('flex');
  advanceToStepTwo();
});

commitButton.addEventListener('click', () => {
  if (round2Attempted) return;
  round2Attempted = true;
  commitButton.disabled = true;
  commitButton.classList.add('cursor-not-allowed', 'opacity-50');

  const acceptedRules = new Set(['.env', '.env.local', '*.env', '.env*']);
  const ignoreRules = gitignoreEditor.value
    .split('\n')
    .map((line) => line.split('#')[0].trim());
  round2Passed = ignoreRules.some((rule) => acceptedRules.has(rule));
  updateRoundStatus(roundTwoStatus, round2Passed);

  if (round2Passed) {
    gitTerminalOutput.textContent = '[SUCCESS] Environment files are excluded by .gitignore.';
    gitTerminalOutput.className = 'text-emerald-400';
    envWarningBadge.classList.add('hidden');
  } else {
    gitTerminalOutput.textContent = '[ERROR] No accepted environment-file rule was found in .gitignore.';
    gitTerminalOutput.className = 'text-red-300';
  }

  window.setTimeout(showAssessmentSummary, 1000);
});

summaryAction.addEventListener('click', async () => {
  const isQualified = summaryAction.dataset.qualified === 'true';
  summaryAction.disabled = true;
  summaryFeedback.classList.add('hidden');

  try {
    await saveQualification(isQualified);
    window.location.assign(isQualified ? '/student-cs.html' : '/student-non-cs.html');
  } catch (error) {
    showFeedback(summaryFeedback, error.message || 'Unable to save your qualification result. Please try again.');
    summaryAction.disabled = false;
  }
});
