const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Stub the models so the service never touches a database
let rows = [];
let calls = 0;
let failNext = false;
const modelsPath = require.resolve(path.join(__dirname, '../models/index.js'));
require.cache[modelsPath] = {
    id: modelsPath, filename: modelsPath, loaded: true,
    exports: {
        GlobalConfig: {
            findAll: async () => {
                calls++;
                if (failNext) throw new Error('db down');
                return rows;
            }
        }
    }
};
const { getLaunchStatus, clearLaunchCache, parseLaunched, DEFAULT_MESSAGE } = require('../services/launchService');

const set = (launched, message) => {
    rows = [];
    if (launched !== undefined) rows.push({ key: 'launched', value: launched });
    if (message !== undefined) rows.push({ key: 'launchedMessage', value: message });
    clearLaunchCache();
};

test('only the word "false" (any case, any spacing) means not launched', () => {
    for (const v of ['false', 'FALSE', ' False ']) assert.equal(parseLaunched(v), false, v);
    for (const v of ['true', 'TRUE', '', undefined, null, 'yes', '0']) assert.equal(parseLaunched(v), true, String(v));
});

test('reads the switch and message from the settings', async () => {
    set('false', 'Opening Monday!');
    assert.deepEqual(await getLaunchStatus(), { launched: false, message: 'Opening Monday!' });
    set('true', 'ignored while launched');
    assert.equal((await getLaunchStatus()).launched, true);
});

test('missing settings leave the shop open with the default message', async () => {
    set();
    assert.deepEqual(await getLaunchStatus(), { launched: true, message: DEFAULT_MESSAGE });
});

test('a blank or whitespace message falls back to the default', async () => {
    set('false', '   ');
    assert.equal((await getLaunchStatus()).message, DEFAULT_MESSAGE);
    set('false', '');
    assert.equal((await getLaunchStatus()).message, DEFAULT_MESSAGE);
});

test('results are cached briefly and clearLaunchCache refreshes them', async () => {
    set('true');
    calls = 0;
    await getLaunchStatus();
    await getLaunchStatus();
    await getLaunchStatus();
    assert.equal(calls, 1);
    rows = [{ key: 'launched', value: 'false' }];
    assert.equal((await getLaunchStatus()).launched, true);   // still the cached answer
    clearLaunchCache();
    assert.equal((await getLaunchStatus()).launched, false);  // refreshed after a save
});

test('if the settings cannot be read: keep the last known state, or stay open', async () => {
    set('false', 'Not yet');
    await getLaunchStatus();                                   // primes the cache
    failNext = true;
    // expire the cache without clearing it by faking the clock
    const realNow = Date.now;
    Date.now = () => realNow() + 60 * 1000;
    try {
        assert.deepEqual(await getLaunchStatus(), { launched: false, message: 'Not yet' });
        clearLaunchCache();
        assert.deepEqual(await getLaunchStatus(), { launched: true, message: DEFAULT_MESSAGE });
    } finally {
        Date.now = realNow;
        failNext = false;
    }
});
