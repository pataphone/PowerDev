const config = require('../config');
const { parseTags } = require('../utils/tags');
const { parseImportance } = require('../utils/importance');

// Forms shown by /submit as Discord modals (max 5 fields per modal).
//
// To add a form: add an object to FORMS. It appears in /submit after `npm run register`.
//   label     name shown in the /submit choices
//   title     modal title (max 45 characters)
//   autoTags  tags added to every entry created from this form
//   hidden    true = not offered in /submit (used internally, e.g. the "Add more" button)
//   fields    text inputs. Each has: id, label, style ('short' | 'paragraph'), required,
//             maxLength, placeholder. Optional:
//               type: 'tags' | 'importance'  -> parsed instead of saved as text
//               heading: false               -> value is saved without its label
//
// All normal fields are merged into ONE text value:   Title\n\n**Label**\nvalue ...
// (the database only stores one text column, see CONTRIBUTING.md for why that is enough).

const TAGS_FIELD = {
  id: 'tags',
  type: 'tags',
  label: 'Tags (comma separated)',
  style: 'short',
  required: false,
  maxLength: 200,
  placeholder: 'e.g. game, ui',
};

const IMPORTANCE_FIELD = {
  id: 'importance',
  type: 'importance',
  label: 'Importance (low / normal / high)',
  style: 'short',
  required: false,
  maxLength: 6,
  placeholder: 'normal',
};

const FORMS = {
  idea: {
    label: 'Idea',
    title: 'Submit an idea',
    autoTags: ['idea'],
    fields: [
      { id: 'title', label: 'Title', style: 'short', required: true, maxLength: 100, heading: false },
      {
        id: 'details',
        label: 'Details',
        style: 'paragraph',
        required: false,
        maxLength: 1000,
        placeholder: 'What is the idea? Why would it be useful?',
      },
      TAGS_FIELD,
      IMPORTANCE_FIELD,
    ],
  },

  bug: {
    label: 'Bug report',
    title: 'Report a bug',
    autoTags: ['bug'],
    fields: [
      { id: 'title', label: 'Title', style: 'short', required: true, maxLength: 100, heading: false },
      {
        id: 'actual',
        label: 'What happened?',
        style: 'paragraph',
        required: true,
        maxLength: 1000,
      },
      {
        id: 'steps',
        label: 'Steps to reproduce',
        style: 'paragraph',
        required: false,
        maxLength: 1000,
        placeholder: '1. ...\n2. ...',
      },
      TAGS_FIELD,
      IMPORTANCE_FIELD,
    ],
  },

  report: {
    label: 'Report',
    title: 'Submit a report',
    autoTags: ['report'],
    fields: [
      { id: 'subject', label: 'Subject', style: 'short', required: true, maxLength: 100, heading: false },
      { id: 'details', label: 'Details', style: 'paragraph', required: true, maxLength: 1500 },
      TAGS_FIELD,
      IMPORTANCE_FIELD,
    ],
  },

  other: {
    label: 'Other',
    title: 'Submit something else',
    autoTags: ['other'],
    fields: [
      { id: 'title', label: 'Title', style: 'short', required: true, maxLength: 100, heading: false },
      { id: 'details', label: 'Details', style: 'paragraph', required: false, maxLength: 1500 },
      TAGS_FIELD,
      IMPORTANCE_FIELD,
    ],
  },

  // Used by the "Add more" button on entry messages.
  quick: {
    label: 'Quick add',
    title: 'Add another entry',
    hidden: true,
    autoTags: [],
    fields: [
      {
        id: 'text',
        label: 'Text',
        style: 'paragraph',
        required: true,
        maxLength: config.MAX_ENTRY_TEXT,
        heading: false,
      },
      TAGS_FIELD,
      IMPORTANCE_FIELD,
    ],
  },
};

// Forms offered by /submit.
function publicForms() {
  return Object.entries(FORMS)
    .filter(([, form]) => !form.hidden)
    .map(([id, form]) => ({ id, ...form }));
}

// Turns submitted modal values ({ fieldId: string }) into the arguments of createEntry().
function buildEntryInput(form, values) {
  const parts = [];
  let tags = [...(form.autoTags || [])];
  let importance = '';

  for (const field of form.fields) {
    const value = String(values[field.id] ?? '').trim();
    if (field.type === 'tags') {
      tags = tags.concat(parseTags(value));
    } else if (field.type === 'importance') {
      importance = value;
    } else if (value) {
      parts.push(field.heading === false ? value : `**${field.label}**\n${value}`);
    }
  }

  return {
    text: parts.join('\n\n'),
    tags: parseTags(tags),
    importance: parseImportance(importance),
  };
}

module.exports = { FORMS, publicForms, buildEntryInput };
