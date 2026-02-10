/**
 * Intent detection from call transcript/summary.
 * Detects when the user shows intent to schedule a call / meeting with Devanshi.
 */

/**
 * Phrases that indicate the user wants to schedule a call or meeting with Devanshi.
 * Only when both "scheduling" intent and "with Devanshi/you" context are present do we fire.
 */
const SCHEDULE_INTENT_PHRASES = [
  'schedule a call',
  'schedule a meeting',
  'book a call',
  'book a meeting',
  'set up a call',
  'set up a meeting',
  'set up a time',
  'have a call',
  'have a meeting',
  'get on a call',
  'get on a call with',
  'arrange a call',
  'arrange a meeting',
  'plan a call',
  'plan a meeting',
  'call with devanshi',
  'meeting with devanshi',
  'meet with devanshi',
  'talk to devanshi',
  'call you',
  'meet you',
  'schedule with you',
  'book with you',
  'add to my calendar',
  'put on my calendar',
  'put it on the calendar',
  'add to calendar',
  'calendar',
  'available for a call',
  'free for a call',
  'when can we',
  'when can i',
  'next week',
  'next monday',
  'next tuesday',
  'tomorrow at',
  'this week',
];

const DEVANSHI_CONTEXT_PHRASES = [
  'devanshi',
  'with you',
  'with her',
  'call you',
  'meet you',
  'talk to you',
  'schedule with you',
  'book with you',
];

function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().trim();
}

/**
 * Check if text contains any of the given phrases (word-boundary aware, simple).
 */
function containsAny(text, phrases) {
  const t = normalize(text);
  return phrases.some((p) => t.includes(normalize(p)));
}

/**
 * Build full text from conversation for intent detection and date parsing.
 */
export function getFullText(conversation) {
  const parts = [];
  if (conversation.transcript && Array.isArray(conversation.transcript)) {
    conversation.transcript.forEach((entry) => {
      if (entry.message) parts.push(entry.message);
    });
  }
  const summary = conversation.transcript_summary || conversation.call_summary_title || '';
  if (summary) parts.push(summary);
  return parts.join(' ');
}

/**
 * Detect if the user showed intent to schedule a call with Devanshi.
 * Only returns true when both scheduling intent and Devanshi/you context appear in the conversation.
 * @param {object} conversation - { transcript?: Array<{role, message}>, transcript_summary?, call_summary_title? }
 * @returns {{ wantsScheduleCall: boolean, confidence: 'high'|'low'|'none' }}
 */
export function detectScheduleCallIntent(conversation) {
  const text = getFullText(conversation);
  if (!text) return { wantsScheduleCall: false, confidence: 'none' };

  const hasScheduleIntent = containsAny(text, SCHEDULE_INTENT_PHRASES);
  const hasDevanshiContext = containsAny(text, DEVANSHI_CONTEXT_PHRASES);

  if (hasScheduleIntent && hasDevanshiContext) {
    return { wantsScheduleCall: true, confidence: 'high' };
  }
  if (hasScheduleIntent) {
    return { wantsScheduleCall: true, confidence: 'low' };
  }
  return { wantsScheduleCall: false, confidence: 'none' };
}
