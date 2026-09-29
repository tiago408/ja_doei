const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

const documents = new Map();
const scores = [31, 40, 50];
let geminiCalls = 0;

const firestore = {
  collection: (name) => ({
    doc: (id) => {
      const key = `${name}/${id}`;
      return { key, get: async () => ({ data: () => documents.get(key) }) };
    },
  }),
  runTransaction: async (callback) => {
    const writes = [];
    const transaction = {
      get: async (ref) => ({ data: () => documents.get(ref.key) }),
      set: (ref, data) => writes.push([ref.key, data]),
    };
    const result = await callback(transaction);
    for (const [key, data] of writes) {
      documents.set(key, { ...(documents.get(key) || {}), ...data });
    }
    return result;
  },
};

const mocks = {
  'firebase-functions/v1': {
    firestore: { document: () => ({ onCreate: () => () => {} }) },
    auth: { user: () => ({ onDelete: () => () => {} }) },
  },
  'firebase-functions/v2/https': { onRequest: (_options, handler) => handler },
  'firebase-admin': {
    initializeApp() {},
    firestore: Object.assign(() => firestore, {
      FieldValue: { serverTimestamp: () => 'test-timestamp' },
    }),
  },
  '@google/generative-ai': {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: async () => {
            const credits = scores[geminiCalls++];
            return {
              response: {
                text: () => JSON.stringify({
                  title: 'Item de teste',
                  category: 'Outros',
                  credits,
                  justification: 'Avaliação simulada',
                  isInvalid: false,
                  invalidReason: '',
                }),
              },
            };
          },
        };
      }
    },
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === './lalamove' && parent?.filename.endsWith('/functions/index.js')) {
    return { quoteLalamove: () => {}, createLalamoveOrder: () => {} };
  }
  if (mocks[request]) return mocks[request];
  return originalLoad.call(this, request, parent, isMain);
};

let evaluateItem;
try {
  process.env.GEMINI_API_KEY = 'test-key';
  ({ evaluateItem } = require('./index.js'));
} finally {
  Module._load = originalLoad;
}

function makeResponse() {
  return {
    statusCode: 200,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}

test('locks the third evaluation to the average and skips Gemini on the fourth', async () => {
  const results = [];

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = makeResponse();
    await evaluateItem({ method: 'POST', body: { draftId: 'draft-test' } }, response);
    assert.equal(response.statusCode, 200);
    results.push(response.body);
  }

  const saved = [...documents.values()][0];
  assert.deepEqual(results.map((result) => result.credits), [31, 40, 40, 40]);
  assert.deepEqual(saved.evaluationHistory, [31, 40, 50]);
  assert.equal(saved.lockedValue, 40);
  assert.equal(saved.isLocked, true);
  assert.equal(results[2].isLocked, true);
  assert.equal(results[3].isLocked, true);
  assert.equal(geminiCalls, 3);
});