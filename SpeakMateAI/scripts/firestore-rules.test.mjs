import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'speakmate-test',
  firestore: { rules: readFileSync('/app/SpeakMateAI/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', 'bob'), { email: 'bob@x.com', displayName: 'Bob', photoURL: '', isPremium: false });
  await setDoc(doc(db, 'users', 'old'), { email: 'old@x.com', displayName: 'Old', photoURL: '', isPremium: true, xp: 5 });
  await setDoc(doc(db, 'system', 'config'), { globalAIEnabled: true });
  await setDoc(doc(db, 'leaderboard', 'bob'), { displayName: 'Bob', xp: 100 });
});

const alice = env.authenticatedContext('alice', { email: 'alice@x.com', email_verified: true }).firestore();
const old = env.authenticatedContext('old', { email: 'old@x.com', email_verified: true }).firestore();
const admin = env.authenticatedContext('adm', { email: 'shivamkks112@gmail.com', email_verified: true }).firestore();
const fakeAdmin = env.authenticatedContext('fk', { email: 'shivamkks112@gmail.com', email_verified: false }).firestore();
const anon = env.unauthenticatedContext().firestore();

const results = [];
const t = async (name, p, ok) => {
  try { await (ok ? assertSucceeds(p) : assertFails(p)); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
};

const base = { email: 'alice@x.com', displayName: 'Alice', photoURL: '', isPremium: false, createdAt: serverTimestamp() };
await t('user create own doc (ensureUserDoc)', setDoc(doc(alice, 'users', 'alice'), base), true);
await t('user create with isPremium true', setDoc(doc(alice, 'users', 'alice2'), { ...base, isPremium: true }), false);
await t('user create doc for other uid', setDoc(doc(alice, 'users', 'mallory'), base), false);
await t('user create extra field plan', setDoc(doc(env.authenticatedContext('c', { email: 'c@x.com' }).firestore(), 'users', 'c'), { ...base, email: 'c@x.com', plan: 'lifetime' }), false);
await t('user read own doc', getDoc(doc(alice, 'users', 'alice')), true);
await t('user read other doc', getDoc(doc(alice, 'users', 'bob')), false);
await t('user list users', getDocs(collection(alice, 'users')), false);
await t('update displayName/photoURL', updateDoc(doc(alice, 'users', 'alice'), { displayName: 'Al', photoURL: 'https://x/y.png' }), true);
await t('update isPremium blocked', updateDoc(doc(alice, 'users', 'alice'), { isPremium: true }), false);
await t('legacy user (isPremium:true) can still edit name', updateDoc(doc(old, 'users', 'old'), { displayName: 'Old2' }), true);
await t('update other user blocked', updateDoc(doc(alice, 'users', 'bob'), { displayName: 'hax' }), false);
await t('anon read users blocked', getDoc(doc(anon, 'users', 'bob')), false);
await t('favorites own write', setDoc(doc(alice, 'users', 'alice', 'favorites', 'w1'), { wordId: 'w1', createdAt: Date.now() }), true);
await t('favorites other write', setDoc(doc(alice, 'users', 'bob', 'favorites', 'w1'), { wordId: 'w1', createdAt: 1 }), false);
await t('progress own write', setDoc(doc(alice, 'progress', 'alice'), { totalSessions: 3 }, { merge: true }), true);
await t('progress own read', getDoc(doc(alice, 'progress', 'alice')), true);
await t('progress premium field blocked', setDoc(doc(alice, 'progress', 'alice'), { isPremium: true }, { merge: true }), false);
await t('progress other read', getDoc(doc(alice, 'progress', 'bob')), false);
await t('leaderboard own write', setDoc(doc(alice, 'leaderboard', 'alice'), { displayName: 'Alice', xp: 50, updatedAt: serverTimestamp() }), true);
await t('leaderboard write other', setDoc(doc(alice, 'leaderboard', 'bob'), { displayName: 'X', xp: 9999999 }), false);
await t('leaderboard extra email field', setDoc(doc(alice, 'leaderboard', 'alice'), { displayName: 'A', xp: 1, email: 'a@x' }), false);
await t('leaderboard negative xp', setDoc(doc(alice, 'leaderboard', 'alice'), { displayName: 'A', xp: -5 }), false);
await t('leaderboard query signed-in', getDocs(query(collection(alice, 'leaderboard'), orderBy('xp', 'desc'), limit(50))), true);
await t('leaderboard anon blocked', getDocs(collection(anon, 'leaderboard')), false);
await t('system/config anon read', getDoc(doc(anon, 'system', 'config')), true);
await t('system/config user write blocked', updateDoc(doc(alice, 'system', 'config'), { globalAIEnabled: false }), false);
await t('system/config unverified admin blocked', updateDoc(doc(fakeAdmin, 'system', 'config'), { globalAIEnabled: false }), false);
await t('system/config admin write', updateDoc(doc(admin, 'system', 'config'), { globalAIEnabled: false, updatedAt: 'x' }), true);
await t('unknown collection read blocked', getDoc(doc(alice, 'subscriptions', 'alice')), false);
await t('unknown collection write blocked', setDoc(doc(alice, 'payments', 'p1'), { a: 1 }), false);

await env.cleanup();
for (const r of results) console.log(r.join(' | '));
console.log(`\n${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
