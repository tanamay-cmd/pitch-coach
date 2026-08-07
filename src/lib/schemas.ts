/**
 * JSON Schemas passed to the Messages API via `output_config.format`, so the coaching
 * response is guaranteed parseable instead of hoping the model returns clean JSON.
 *
 * Constraints the API does not support (minimum/maximum, minLength, recursion) are
 * deliberately absent — they would be stripped anyway.
 */

export const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The question, asked the way a real person would ask it.' },
          probing: {
            type: 'string',
            description: 'One line on what the asker is really testing, so the speaker knows what to aim at.',
          },
        },
        required: ['text', 'probing'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
} as const

export const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer', description: 'Score out of 100 for this answer.' },
    headline: { type: 'string', description: 'One sentence verdict. Blunt, specific, no preamble.' },
    dimensions: {
      type: 'array',
      description: 'Four or five scored dimensions appropriate to the mode.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'integer', description: 'Out of 100.' },
          comment: { type: 'string', description: 'One or two sentences, referencing what they actually said.' },
        },
        required: ['name', 'score', 'comment'],
        additionalProperties: false,
      },
    },
    strengths: {
      type: 'array',
      description: 'Two to four things that genuinely worked. Quote their words.',
      items: { type: 'string' },
    },
    fixes: {
      type: 'array',
      description: 'Two to four highest-leverage fixes, most important first.',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string', description: 'What went wrong, in one sentence.' },
          quote: { type: 'string', description: 'Their exact words that show the problem. Empty string if none applies.' },
          instead: { type: 'string', description: 'The concrete replacement wording they could say instead.' },
        },
        required: ['issue', 'quote', 'instead'],
        additionalProperties: false,
      },
    },
    modelAnswer: {
      type: 'string',
      description:
        'A full answer they could say out loud in roughly the target time, in their own register, inventing no facts.',
    },
    followUpQuestion: {
      type: 'string',
      description: 'The single question to practise next, given how this one went.',
    },
  },
  required: ['overallScore', 'headline', 'dimensions', 'strengths', 'fixes', 'modelAnswer', 'followUpQuestion'],
  additionalProperties: false,
} as const
