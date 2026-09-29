const assert = require('node:assert/strict');
const Module = require('node:module');
const { test } = require('node:test');

const documents = new Map();
const scores = [90, 125, 145];
let geminiCalls = 0;

const firestore = {
  collection: (name) => ({
    doc: (id) => {
      const key = `${name}/${id}`;
      return {
        key,
        id,
        path: key,
        get: async () => ({ data: () => documents.get(key) }),
      };
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
  },
  'firebase-admin/firestore': {
    getFirestore: () => firestore,
    FieldValue: { serverTimestamp: () => 'test-timestamp' },
  },
  'firebase-admin/auth': {
    getAuth: () => ({ verifyIdToken: async (token) => ({ uid: token }) }),
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
                  title: 'Garrafa térmica Track & Field',
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

test('reuses the first evaluation for the same user and image, but not for another user', async () => {
  const results = [];
  const requests = [
    { userId: 'user-a', imageBase64: 'photo-one', titleText: 'Garrafa térmica Track & Field' },
    { userId: 'user-a', imageBase64: 'photo-two', titleText: 'Item fotografado' },
    { userId: 'user-b', imageBase64: 'photo-two', titleText: 'Item fotografado' },
  ];

  for (const request of requests) {
    const response = makeResponse();
    await evaluateItem({
      method: 'POST',
      headers: { authorization: `Bearer ${request.userId}` },
      body: { imageBase64: request.imageBase64, titleText: request.titleText },
    }, response);
    assert.equal(response.statusCode, 200);
    results.push(response.body);
  }

  assert.deepEqual(results.map((result) => result.credits), [90, 90, 145]);
  assert.equal(results[1].title, results[0].title);
  assert.equal(documents.size, 5);
  assert.equal(geminiCalls, 3);
});

test('rejects requests without a verified Firebase user', async () => {
  const response = makeResponse();
  await evaluateItem({ method: 'POST', body: { imageBase64: 'same-item-photo' } }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(geminiCalls, 3);
});