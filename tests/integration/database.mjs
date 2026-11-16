import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const f = JSON.parse(
  readFileSync(new URL("../fixtures.json", import.meta.url)),
);
const connectionString = process.env.DATABASE_URL;
if (
  !connectionString ||
  !["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname)
)
  throw Error("Tests require a local disposable database");
const pool = new pg.Pool({ connectionString, max: 8 });
async function as(user, query, args = []) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
    await c.query("set local role authenticated");
    const r = await c.query(query, args);
    await c.query("commit");
    return r.rows;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
const cmd = (op, payload, org = f.a, user = f.a_owner, key = randomUUID()) =>
  as(user, "select public.command($1,$2,$3,$4) as id", [
    org,
    op,
    payload,
    key,
  ]).then((r) => r[0].id);
let tick = 0;
async function service({ capacity = 12, mode = "shared", at } = {}) {
  return cmd("create_service", {
    experience_id: f["a_" + mode],
    location_id: f.a_location,
    starts_at: at ?? `2028-01-${String(++tick).padStart(2, "0")}T10:00:00Z`,
    capacity,
  });
}
async function request(sid, pax = 1) {
  return cmd("create_request", {
    contact_id: f.a_contact,
    channel_id: f.a_channel,
    service_id: sid,
    adults: pax,
    children: 0,
  });
}
async function booking(sid, pax = 1, op = "confirm_request") {
  const id = await request(sid, pax);
  return cmd(op, {
    id,
    expected_version: 1,
    service_id: sid,
    override_reason: "Test synthetic override",
  });
}
const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}
const denied = async (fn, pattern) => assert.rejects(fn, pattern);
test("Tenant A cannot read B or write a cross-tenant relation", async () => {
  const rows = await as(
    f.a_owner,
    "select id from public.contacts where organization_id=$1",
    [f.b],
  );
  assert.equal(rows.length, 0);
  await denied(
    () =>
      cmd("create_request", {
        contact_id: f.b_contact,
        channel_id: f.a_channel,
        adults: 1,
        children: 0,
      }),
    /foreign key/,
  );
  await denied(
    () => cmd("save_contact", { display_name: "Forbidden" }, f.b),
    /FORBIDDEN/,
  );
});
test("Staff and partner cannot read prices, private contacts, notes, or audit", async () => {
  for (const user of [f.a_chef, f.a_driver, f.a_partner]) {
    for (const table of [
      "booking_financials",
      "booking_price_lines",
      "payment_entries",
      "contacts",
      "service_notes",
    ])
      assert.equal((await as(user, `select * from public.${table}`)).length, 0);
    await denied(
      () => as(user, "select * from private.audit_events"),
      /permission denied/,
    );
    await denied(
      () =>
        cmd(
          "record_payment_entry",
          {
            booking_id: f.a_booking,
            kind: "receipt",
            amount_minor: 100,
            method: "cash",
          },
          f.a,
          user,
        ),
      /FORBIDDEN/,
    );
  }
});
test("Direct DML and metadata cannot escalate roles; last owner protected", async () => {
  await denied(
    () =>
      as(
        f.a_manager,
        "insert into public.membership_roles(organization_id,membership_id,role) values($1,$2,'owner')",
        [f.a, f.a_manager_membership],
      ),
    /permission denied/,
  );
  await denied(
    () =>
      cmd(
        "set_membership",
        {
          id: f.a_admin_membership,
          role: "owner",
          status: "active",
          expected_version: 1,
        },
        f.a,
        f.a_admin,
      ),
    /OWNER_REQUIRED/,
  );
  await denied(
    () =>
      cmd("set_membership", {
        id: f.a_owner_membership,
        role: "manager",
        status: "active",
        expected_version: 1,
      }),
    /LAST_OWNER/,
  );
  await denied(
    () =>
      as(f.a_owner, "update public.bookings set adults=100 where id=$1", [
        f.a_booking,
      ]),
    /permission denied/,
  );
});
test("Two concurrent confirmations of the last place: exactly one succeeds", async () => {
  const sid = await service({ capacity: 1 });
  const a = await request(sid),
    b = await request(sid);
  const results = await Promise.allSettled(
    [a, b].map((id) =>
      cmd("confirm_request", {
        id,
        expected_version: 1,
        service_id: sid,
        override_reason: "Test",
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    results.find((r) => r.status === "rejected").reason.message,
    /CAPACITY_EXCEEDED/,
  );
  const rows = await pool.query(
    "select sum(adults+children)::int as pax from public.bookings where service_id=$1 and status='confirmed'",
    [sid],
  );
  assert.equal(rows.rows[0].pax, 1);
});
test("A private booking reserves the entire service", async () => {
  const sid = await service({ mode: "private" });
  await booking(sid, 2);
  await denied(() => booking(sid, 1), /CAPACITY_EXCEEDED/);
});
test("Expired hold frees capacity without a cleanup job", async () => {
  const sid = await service({ capacity: 1 });
  const bid = await booking(sid, 1, "create_hold");
  await pool.query(
    "update public.bookings set hold_expires_at=now()-interval '1 minute' where id=$1",
    [bid],
  );
  await booking(sid, 1);
  await denied(
    () => cmd("confirm_booking", { booking_id: bid, expected_version: 1 }),
    /HOLD_EXPIRED/,
  );
});
test("Two simultaneous assignments cannot reserve the same staff slot", async () => {
  const s1 = await service({ at: "2028-02-10T10:00:00Z" }),
    s2 = await service({ at: "2028-02-10T10:00:00Z" });
  const results = await Promise.allSettled(
    [s1, s2].map((service_id) =>
      cmd("assign_staff", {
        service_id,
        staff_id: f.a_chef_staff,
        operational_role: "chef",
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    results.find((r) => r.status === "rejected").reason.message,
    /exclusion constraint/,
  );
});
test("Resource exclusion and availability exceptions are enforced", async () => {
  const s1 = await service({ at: "2028-02-11T10:00:00Z" }),
    s2 = await service({ at: "2028-02-11T10:00:00Z" });
  await cmd("reserve_resource", { service_id: s1, resource_id: f.a_resource });
  await denied(
    () =>
      cmd("reserve_resource", { service_id: s2, resource_id: f.a_resource }),
    /exclusion constraint/,
  );
  await cmd("set_availability", {
    staff_id: f.a_chef_staff,
    starts_at: "2028-02-11T09:00:00Z",
    ends_at: "2028-02-11T13:00:00Z",
    kind: "unavailable",
  });
  await denied(
    () =>
      cmd("assign_staff", {
        service_id: s1,
        staff_id: f.a_chef_staff,
        operational_role: "chef",
      }),
    /STAFF_UNAVAILABLE/,
  );
});
test("Failed booking move rolls back service, price, version and participants", async () => {
  const source = await service(),
    full = await service({ capacity: 1 });
  const bid = await booking(source, 2);
  await booking(full, 1);
  const before = (
    await pool.query("select * from public.bookings where id=$1", [bid])
  ).rows[0];
  const price = (
    await pool.query(
      "select gross_minor from public.booking_financials where booking_id=$1",
      [bid],
    )
  ).rows[0];
  await denied(
    () =>
      cmd("change_booking", {
        booking_id: bid,
        service_id: full,
        adults: 2,
        children: 0,
        expected_version: 1,
        override_reason: "Test",
      }),
    /CAPACITY_EXCEEDED/,
  );
  assert.deepEqual(
    (await pool.query("select * from public.bookings where id=$1", [bid]))
      .rows[0],
    before,
  );
  assert.deepEqual(
    (
      await pool.query(
        "select gross_minor from public.booking_financials where booking_id=$1",
        [bid],
      )
    ).rows[0],
    price,
  );
});
test("Failed service reschedule rolls back all assignment intervals", async () => {
  const one = await service({ at: "2028-03-01T10:00:00Z" }),
    two = await service({ at: "2028-03-02T10:00:00Z" });
  for (const sid of [one, two])
    await cmd("assign_staff", {
      service_id: sid,
      staff_id: f.a_chef_staff,
      operational_role: "chef",
    });
  await denied(
    () =>
      cmd("reschedule_service", {
        service_id: two,
        starts_at: "2028-03-01T10:00:00Z",
        expected_version: 1,
      }),
    /exclusion constraint/,
  );
  assert.equal(
    (
      await pool.query("select starts_at from public.services where id=$1", [
        two,
      ])
    ).rows[0].starts_at.toISOString(),
    "2028-03-02T10:00:00.000Z",
  );
});
test("Suspending a membership removes access with the same identity", async () => {
  assert.ok(
    (await as(f.a_manager, "select * from public.contacts")).length > 0,
  );
  await cmd("set_membership", {
    id: f.a_manager_membership,
    expected_version: 1,
    role: "manager",
    status: "suspended",
  });
  assert.equal(
    (await as(f.a_manager, "select * from public.contacts")).length,
    0,
  );
  await denied(
    () => cmd("save_contact", { display_name: "Denied" }, f.a, f.a_manager),
    /FORBIDDEN/,
  );
  await cmd("set_membership", {
    id: f.a_manager_membership,
    expected_version: 2,
    role: "manager",
    status: "active",
  });
});
test("Payment retry is idempotent; different payload rejected; ledger immutable", async () => {
  const key = randomUUID(),
    payload = {
      booking_id: f.a_booking,
      kind: "receipt",
      amount_minor: 12500,
      method: "cash",
    };
  const result = await Promise.all([
    cmd("record_payment_entry", payload, f.a, f.a_owner, key),
    cmd("record_payment_entry", payload, f.a, f.a_owner, key),
  ]);
  assert.equal(result[0], result[1]);
  assert.equal(
    (
      await pool.query(
        "select count(*)::int as n from public.payment_entries where id=$1",
        [result[0]],
      )
    ).rows[0].n,
    1,
  );
  await denied(
    () =>
      cmd(
        "record_payment_entry",
        { ...payload, amount_minor: 15000 },
        f.a,
        f.a_owner,
        key,
      ),
    /IDEMPOTENCY_MISMATCH/,
  );
  await denied(
    () =>
      as(f.a_owner, "delete from public.payment_entries where id=$1", [
        result[0],
      ]),
    /permission denied/,
  );
  await cmd("record_payment_entry", {
    booking_id: f.a_booking,
    kind: "reversal",
    reverses_entry_id: result[0],
  });
  await denied(
    () =>
      cmd("record_payment_entry", {
        booking_id: f.a_booking,
        kind: "reversal",
        reverses_entry_id: result[0],
      }),
    /unique constraint/,
  );
});
test("Versions reject stale changes and collected participants are not silently removed", async () => {
  const sid = await service();
  const bid = await booking(sid, 2);
  const participant = (
    await pool.query(
      "select * from public.participants where booking_id=$1 and ordinal=2",
      [bid],
    )
  ).rows[0];
  await cmd("update_participant", {
    id: participant.id,
    expected_version: 1,
    display_name: "Synthetic Guest",
    dietary_collection_status: "declared_none",
  });
  await denied(
    () =>
      cmd("change_booking", {
        booking_id: bid,
        adults: 1,
        children: 0,
        expected_version: 1,
        allow_removal: true,
      }),
    /PARTICIPANT_REMOVAL_REQUIRES_REVIEW/,
  );
  await denied(
    () =>
      cmd("cancel_booking", {
        booking_id: bid,
        expected_version: 99,
        reason: "Test",
      }),
    /VERSION_CONFLICT/,
  );
});
test("Real Auth login + REST RLS, metadata spoofing and suspension with old JWT", async () => {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email: "manager.a@example.test",
    password: "Comanda-Test-Only-2026!",
  });
  assert.equal(error, null);
  await client.auth.updateUser({
    data: { role: "owner", organization_id: f.b },
  });
  const own = await client.from("contacts").select("id");
  assert.equal(own.error, null);
  assert.ok(own.data.length > 0);
  const other = await client
    .from("contacts")
    .select("id")
    .eq("organization_id", f.b);
  assert.deepEqual(other.data, []);
  const escalation = await client.rpc("command", {
    p_org: f.a,
    p_operation: "set_membership",
    p_key: randomUUID(),
    p_payload: {
      id: f.a_manager_membership,
      expected_version: 3,
      role: "owner",
      status: "active",
    },
  });
  assert.ok(escalation.error);
  await cmd("set_membership", {
    id: f.a_manager_membership,
    expected_version: 3,
    role: "manager",
    status: "suspended",
  });
  const suspended = await client.from("contacts").select("id");
  assert.deepEqual(suspended.data, []);
  await cmd("set_membership", {
    id: f.a_manager_membership,
    expected_version: 4,
    role: "manager",
    status: "active",
  });
  await client.auth.signOut();
});
test("Every exposed table has RLS; privileged functions have fixed path and no PUBLIC execute", async () => {
  const tables = await pool.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
  );
  assert.deepEqual(tables.rows, []);
  const defs = await pool.query(
    "select proname,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and prosecdef",
  );
  assert.ok(defs.rows.length > 0);
  for (const r of defs.rows)
    assert.ok(r.proconfig?.some((v) => v.startsWith("search_path=")));
  const leaked = await pool.query(
    "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl where n.nspname in ('public','private') and p.prosecdef and acl.grantee=0 and acl.privilege_type='EXECUTE'",
  );
  assert.deepEqual(leaked.rows, []);
});
test("Dietary access follows capability/window/release and revision acknowledgements", async()=>{
 const now=(await pool.query("select now()+interval '1 hour' as start")).rows[0].start.toISOString();
 const sid=await service({at:now});const aid=await cmd('assign_staff',{service_id:sid,staff_id:f.a_chef_staff,operational_role:'chef'});
 await cmd('respond_assignment',{id:aid,expected_version:1,status:'accepted'},f.a,f.a_chef);
 const bid=await booking(sid,1);const participant=(await pool.query('select id from public.participants where booking_id=$1',[bid])).rows[0].id;
 const did=await cmd('save_dietary',{participant_id:participant,type:'allergy',label:'Synthetic sensitive detail',severity:'high',source:'Test declaration'});
 assert.equal((await as(f.a_chef,'select id from public.dietary_requirements where id=$1',[did])).length,1);
 assert.equal((await as(f.a_driver,'select id from public.dietary_requirements where id=$1',[did])).length,0);
 await cmd('verify_dietary',{id:did,expected_version:1,verification_status:'verified',instruction:'Synthetic kitchen instruction'});
 const revision=(await pool.query('select dietary_revision from public.services where id=$1',[sid])).rows[0].dietary_revision;
 await cmd('acknowledge_dietary',{id:aid,expected_version:2,dietary_revision:revision},f.a,f.a_chef);
 assert.equal((await as(f.a_owner,'select public.service_readiness($1,$2) as value',[f.a,sid]))[0].value,'ready');
 await cmd('verify_dietary',{id:did,expected_version:2,verification_status:'needs_clarification'});
 await denied(()=>cmd('acknowledge_dietary',{id:aid,expected_version:2,dietary_revision:revision},f.a,f.a_chef),/DIETARY_REVISION_CONFLICT/);
 await cmd('release_assignment',{id:aid,expected_version:2});
 assert.equal((await as(f.a_chef,'select id from public.dietary_requirements where id=$1',[did])).length,0);
 const audit=await pool.query("select row_to_json(a)::text as data from private.audit_events a where organization_id=$1",[f.a]);
 assert.ok(audit.rows.every(r=>!r.data.includes('Synthetic sensitive detail')&&!r.data.includes('Synthetic kitchen instruction')));
});
test("Invitation is bound to authenticated email, single use and role authority", async()=>{
 const uid=randomUUID();const email=`invite-${uid}@example.test`;
 await pool.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[uid,email]);
 const token=randomUUID()+randomUUID();const hash=(await pool.query("select encode(extensions.digest($1,'sha256'),'hex') as value",[token])).rows[0].value;
 await cmd('create_invitation',{email,role:'manager',token_hash:hash});
 await denied(()=>as(f.a_partner,'select public.accept_invitation($1)',[token]),/(INVALID_INVITATION|MEMBERSHIP_ALREADY_EXISTS)/);
 assert.equal((await as(uid,'select public.accept_invitation($1) as org',[token]))[0].org,f.a);
 await denied(()=>as(uid,'select public.accept_invitation($1)',[token]),/(INVALID_INVITATION|MEMBERSHIP_ALREADY_EXISTS)/);
 assert.ok((await as(uid,'select * from public.contacts')).length>0);
});
let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}
await pool.end();
console.log(
  `${tests.length - failed}/${tests.length} database scenarios passed`,
);
process.exitCode = failed ? 1 : 0;
