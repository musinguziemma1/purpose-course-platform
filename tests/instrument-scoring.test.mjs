import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import dotenv from "dotenv";
let client, scoring, appPool, userId, profileId, instrumentId;
const key = randomUUID(), trigger = 'verify_instrument_' + key.replaceAll('-', '_'), answers = [];
async function counts() { return (await client.query("select (select count(*)::int from instrument_sessions where instrument_id=$1) as sessions,(select count(*)::int from instrument_results where instrument_id=$1) as results,(select count(*)::int from instrument_responses where session_id in(select id from instrument_sessions where instrument_id=$1)) as responses", [instrumentId])).rows[0]; }
async function clone(table, row, changes) {
  assert.ok(['instruments', 'instrument_dimensions', 'instrument_items'].includes(table));
  const id = (await client.query("select nextval(pg_get_serial_sequence($1,'id'))::int as id", [table])).rows[0].id;
  await client.query(`insert into ${table} select * from jsonb_populate_record(null::${table},$1::jsonb)`, [JSON.stringify({ ...row, ...changes, id })]); return id;
}
const submit = (responses = answers, consentGiven = true) => scoring.submitInstrument({ instrumentId, profileId, consentGiven, sharedWithMentor: false, responses });
before(async () => {
  const env = dotenv.parse(readFileSync('.env')), uri = new URL(env.DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname) && uri.port === '54329', 'Instrument fixtures require local PostgreSQL.');
  process.env.DATABASE_URL = env.DATABASE_URL; scoring = await import('../src/db/instrument-scoring.ts'); appPool = (await import('../src/db/index.ts')).pool;
  client = new pg.Client({ connectionString: env.DATABASE_URL }); await client.connect();
  userId = (await client.query("insert into users(email,password_hash) values($1,'unused') returning id", [key + '@example.invalid'])).rows[0].id;
  profileId = (await client.query("insert into profiles(user_id,role_id,full_name,slug) select $1,id,'Scoring fixture',$2 from roles where slug='student' returning id", [userId, key])).rows[0].id;
  const template = (await client.query("select to_jsonb(i) as row from instruments i where status='published' order by id limit 1")).rows[0].row;
  instrumentId = await clone('instruments', template, { slug: key }); const dimensions = new Map();
  for (const { row } of (await client.query('select to_jsonb(d) as row from instrument_dimensions d where instrument_id=$1', [template.id])).rows) dimensions.set(row.id, await clone('instrument_dimensions', row, { instrument_id: instrumentId }));
  for (const { row } of (await client.query('select to_jsonb(i) as row from instrument_items i where instrument_id=$1', [template.id])).rows) answers.push({ itemId: await clone('instrument_items', row, { instrument_id: instrumentId, dimension_id: dimensions.get(row.dimension_id) }), rawValue: 3 });
});
test('consent, unique items and bounded integer answers are required before any write', async () => {
  assert.ok((await submit(answers, false)).error);
  assert.ok((await submit(answers.map((answer, index) => index === 0 ? { ...answer, rawValue: 3.5 } : answer))).error);
  assert.ok((await submit(answers.map((answer, index) => index === 0 ? answers[1] : answer))).error);
  assert.deepEqual(await counts(), { sessions: 0, results: 0, responses: 0 });
});
test('session, all responses, scoring trace and private result persist together', async () => {
  const result = await submit(); assert.ok(result.ok); assert.equal(result.result.overallScore, 50);
  assert.equal(result.session.sharedWithMentor, false); assert.equal(result.session.status, 'completed');
  assert.deepEqual(await counts(), { sessions: 1, results: 1, responses: answers.length });
});
test('late result failure rolls back the completed session and every response', async () => {
  await client.query("create function pg_temp.fail_instrument_result() returns trigger language plpgsql as $$begin raise exception 'Verification late result failure'; end$$");
  await client.query(`create trigger ${trigger} before insert on instrument_results for each row when(new.instrument_id=${instrumentId}) execute function pg_temp.fail_instrument_result()`);
  const before = await counts();
  try { await assert.rejects(submit()); assert.deepEqual(await counts(), before); }
  finally { await client.query(`drop trigger ${trigger} on instrument_results`); }
});
test('draft instruments and foreign response items cannot store a result', async () => {
  const before = await counts();
  await client.query("update instruments set status='draft' where id=$1", [instrumentId]); assert.ok((await submit()).error);
  await client.query("update instruments set status='published' where id=$1", [instrumentId]);
  assert.ok((await submit(answers.map((answer, index) => index === 0 ? { ...answer, itemId: 2147483647 } : answer))).error);
  assert.deepEqual(await counts(), before);
});
after(async () => {
  if (client) { if (instrumentId) await client.query('delete from instruments where id=$1', [instrumentId]); if (userId) await client.query('delete from users where id=$1', [userId]); await client.end(); }
  if (appPool) await appPool.end();
});
