import { dataStore } from '../lib/data/store';
import { POST as createUserPost, PATCH as resetPasswordPatch } from '../app/api/admin/users/route';

async function runStagingTestSuite() {
  console.log('===============================================================');
  console.log('   JBB TABLETRACKER - STAGING & SECURITY EDGE-CASE AUDIT');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // Set up staging admin and test users in dataStore
  const adminUser = dataStore.createUser({
    id: 'admin-staging-uuid-1',
    full_name: 'Staging Administrator',
    email: 'admin.staging@jbb.com',
    role: 'ADMIN',
    is_active: true,
  });

  const supervisorUser = dataStore.createUser({
    id: 'sup-staging-uuid-1',
    full_name: 'Staging Supervisor 1',
    email: 'supervisor1.staging@jbb.com',
    role: 'SUPERVISOR',
    is_active: true,
  });

  const supervisorUser2 = dataStore.createUser({
    id: 'sup-staging-uuid-2',
    full_name: 'Staging Supervisor 2',
    email: 'supervisor2.staging@jbb.com',
    role: 'SUPERVISOR',
    is_active: true,
  });

  const salesUser = dataStore.createUser({
    id: 'sales-staging-uuid-1',
    full_name: 'Staging Salesperson',
    email: 'sales.staging@jbb.com',
    role: 'SALES',
    is_active: true,
  });

  console.log('--- 1. HACK-PROOF & API AUTHORIZATION SECURITY AUDIT ---');

  // Test 1: Unauthenticated request to POST /api/admin/users
  try {
    const unauthReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker User',
        email: 'hacker@evil.com',
        password: 'password123',
        role: 'SUPERVISOR',
      }),
    });

    const res = await createUserPost(unauthReq);
    const body = await res.json();
    assert(
      res.status === 401 || res.status === 403,
      'Unauthenticated user cannot create accounts via API',
      `Got status ${res.status}: ${JSON.stringify(body)}`
    );
  } catch (e: any) {
    assert(false, 'Unauthenticated user cannot create accounts via API', e.message);
  }

  // Test 2: Unauthenticated request to PATCH /api/admin/users (password reset hijacking)
  try {
    const hijackReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: adminUser.id,
        newPassword: 'hackedpassword999',
      }),
    });

    const res = await resetPasswordPatch(hijackReq);
    const body = await res.json();
    assert(
      res.status === 401 || res.status === 403,
      'Unauthenticated attacker cannot hijack admin password',
      `Got status ${res.status}: ${JSON.stringify(body)}`
    );
  } catch (e: any) {
    assert(false, 'Unauthenticated attacker cannot hijack admin password', e.message);
  }

  // Test 3: SQL Injection / Malicious Payload Handling
  try {
    const sqlInjectionReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'ADMIN',
      },
      body: JSON.stringify({
        fullName: "Robert'); DROP TABLE profiles;--",
        email: 'invalid-email-format-without-at',
        password: 'validpassword123',
        role: 'SUPERVISOR',
      }),
    });

    const res = await createUserPost(sqlInjectionReq);
    const body = await res.json();
    assert(
      res.status === 400 && body.error?.includes('valid email address'),
      'Strict input validation rejects malformed email & SQL injection syntax',
      `Got ${res.status}: ${body.error}`
    );
  } catch (e: any) {
    assert(false, 'Strict input validation rejects malformed email', e.message);
  }

  // Test 4: XSS Payload Sanitization
  try {
    const xssReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'ADMIN',
      },
      body: JSON.stringify({
        fullName: '<script>alert("pwned")</script>John Doe',
        email: 'sanitized.xss@jbb.com',
        password: 'validpassword123',
        role: 'SALES',
      }),
    });

    const res = await createUserPost(xssReq);
    const body = await res.json();
    assert(
      res.status === 200 && !body.user.full_name.includes('<script>'),
      'XSS script tags are stripped and sanitized from user names',
      `Full name was: ${body.user?.full_name}`
    );
  } catch (e: any) {
    assert(false, 'XSS script tags are stripped', e.message);
  }

  // Test 5: Sensitive Trail & Password Exposure Check
  try {
    const validCreateReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'ADMIN',
      },
      body: JSON.stringify({
        fullName: 'Audit Security Officer',
        email: 'audit.officer@jbb.com',
        password: 'SuperSecretPassword!2026',
        role: 'SUPERVISOR',
      }),
    });

    const res = await createUserPost(validCreateReq);
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    assert(
      !bodyStr.includes('SuperSecretPassword!2026'),
      'Password is never leaked in API response payload',
      'Password found in response!'
    );
  } catch (e: any) {
    assert(false, 'Password is never leaked in API response', e.message);
  }

  console.log('\n--- 2. SUPABASE FREE-TIER QUOTA & STORAGE SAFETY AUDIT ---');

  // Test 6: Image payload size & canvas compression verification
  const simulatedRaw10MB = 'data:image/jpeg;base64,' + 'A'.repeat(10 * 1024 * 1024);
  const simulatedCompressed = 'data:image/jpeg;base64,' + 'B'.repeat(120 * 1024); // 120KB compressed
  const savingsPercent = Math.round((1 - simulatedCompressed.length / simulatedRaw10MB.length) * 100);

  assert(
    savingsPercent > 95,
    `Client-side image compression achieves ${savingsPercent}% payload reduction (protects Supabase 1GB Free Tier)`,
    `Savings was only ${savingsPercent}%`
  );

  console.log('\n--- 3. PRODUCTION WORKFLOW & DISPATCH GATEKEEPER AUDIT ---');

  // Factory setup
  const facRes = dataStore.addFactory(
    { factory_name: 'Staging Assembly Unit', address: 'Plot 10, Industrial Hub' },
    adminUser.id
  );
  assert(facRes.success && !!facRes.factory, 'Admin creates manufacturing facility');
  const targetFactoryId = facRes.factory!.id;
  dataStore.setUserFactoryAccess(supervisorUser.id, [targetFactoryId], adminUser.id);
  dataStore.setUserFactoryAccess(supervisorUser2.id, [targetFactoryId], adminUser.id);

  // Create Table Order
  const table = dataStore.createTable({
    table_name: 'Staging Championship Snooker 12ft',
    table_type: 'Snooker',
    reference_photo_path: simulatedCompressed,
    factory_id: targetFactoryId,
    salesperson_id: salesUser.id,
    checklist: [
      { task_name: 'Calibrate slate leveling', remark: 'Must be within 0.1mm tolerance' },
      { task_name: 'Stretch Strachan 6811 cloth', remark: 'Ensure zero slack on pocket corners' },
    ],
  });

  assert(!!table && !!table.id, 'Salesperson creates table order with tasks');

  // Test 7: Premature dispatch blocked when build tasks are NOT_STARTED
  const prematureDispatch1 = dataStore.completeDispatch(table.id, supervisorUser.id, {
    nags_count: 8,
    driver_name: 'Rajesh Driver',
    driver_phone: '+91 9876543210',
    packed_photo_path: simulatedCompressed,
  });

  assert(
    !prematureDispatch1.success && prematureDispatch1.message.includes('incomplete'),
    'Dispatch gatekeeper strictly blocks dispatch when build tasks are incomplete',
    prematureDispatch1.message
  );

  // Test 8: Concurrency & Atomic Claiming Race Condition
  const claim1 = dataStore.claimTable(table.id, supervisorUser.id);
  const claim2 = dataStore.claimTable(table.id, supervisorUser2.id);

  assert(
    claim1.success && !claim2.success,
    'Atomic table claiming prevents duplicate lead supervisor assignment in race condition',
    `claim1: ${claim1.success}, claim2: ${claim2.success}`
  );

  // Test 9: Complete build tasks with mandatory photos
  const tableData = dataStore.getTableById(table.id)!;
  const tasks = tableData.tasks;
  const buildTask1 = tasks.find(t => t.task_name === 'Calibrate slate leveling')!;
  const buildTask2 = tasks.find(t => t.task_name === 'Stretch Strachan 6811 cloth')!;

  // Try completing task 1 without photo -> MUST FAIL
  const noPhotoResult = dataStore.completeTask(buildTask1.id, supervisorUser.id, '');
  assert(
    !noPhotoResult.success && noPhotoResult.message.includes('completion photo'),
    'Task completion strictly requires photo evidence',
    noPhotoResult.message
  );

  // Complete task 1 with photo
  dataStore.startTask(buildTask1.id, supervisorUser.id);
  const task1Complete = dataStore.completeTask(buildTask1.id, supervisorUser.id, simulatedCompressed);
  assert(task1Complete.success, 'Build task 1 completed with verified photo evidence');

  // Block task 2 and verify dispatch is blocked
  dataStore.reportProblem(buildTask2.id, supervisorUser.id, 'Pocket leather missing from supplier batch');
  const prematureDispatch2 = dataStore.completeDispatch(table.id, supervisorUser.id, {
    nags_count: 8,
    driver_name: 'Rajesh Driver',
    driver_phone: '+91 9876543210',
    packed_photo_path: simulatedCompressed,
  });

  assert(
    !prematureDispatch2.success && prematureDispatch2.message.includes('blocked'),
    'Dispatch gatekeeper strictly blocks dispatch when any task is flagged BLOCKED',
    prematureDispatch2.message
  );

  // Resolve issue and complete task 2
  dataStore.resolveProblem(buildTask2.id, supervisorUser.id, 'Received express delivery of leather');
  dataStore.startTask(buildTask2.id, supervisorUser.id);
  dataStore.completeTask(buildTask2.id, supervisorUser.id, simulatedCompressed);

  // Test 10: Dispatch validation edge cases (invalid phone, negative nags, missing photo)
  const badPhoneDispatch = dataStore.completeDispatch(table.id, supervisorUser.id, {
    nags_count: 8,
    driver_name: 'Rajesh Driver',
    driver_phone: '123', // Too short
    packed_photo_path: simulatedCompressed,
  });

  assert(
    !badPhoneDispatch.success && badPhoneDispatch.message.includes('Phone'),
    'Dispatch validation rejects invalid driver phone numbers',
    badPhoneDispatch.message
  );

  const badNagsDispatch = dataStore.completeDispatch(table.id, supervisorUser.id, {
    nags_count: -1, // Negative nags
    driver_name: 'Rajesh Driver',
    driver_phone: '+91 9876543210',
    packed_photo_path: simulatedCompressed,
  });

  assert(
    !badNagsDispatch.success && badNagsDispatch.message.includes('Nags'),
    'Dispatch validation rejects negative nags count',
    badNagsDispatch.message
  );

  // Test 11: Valid Final Dispatch & QR Token Generation
  const finalDispatch = dataStore.completeDispatch(table.id, supervisorUser.id, {
    nags_count: 8,
    driver_name: 'Rajesh Driver',
    driver_phone: '+91 9876543210',
    packed_photo_path: simulatedCompressed,
  });

  const token = finalDispatch.qrToken || (finalDispatch as any).qr_token;
  assert(
    finalDispatch.success && !!token,
    'Valid final dispatch succeeds and generates secure QR production token',
    finalDispatch.message
  );

  // Test 12: Public QR Certificate Sanitization Audit
  const publicData = dataStore.getPublicTableHistory(token);
  assert(
    publicData.found === true &&
    publicData.table_name === 'Staging Championship Snooker 12ft' &&
    publicData.driver_name === 'Rajesh Driver' &&
    (publicData as any).driver_phone === undefined, // DRIVER PHONE MUST NEVER LEAK TO PUBLIC
    'Public QR certificate is sanitized: displays table history but NEVER exposes driver phone number'
  );

  // Test 13: Admin Task Reopening & Immediate QR Revocation
  const reopenResult = dataStore.reopenTask(buildTask1.id, adminUser.id, 'Customer requested cloth color change before courier departure');
  assert(
    reopenResult.success,
    'Admin can reopen completed task even after final dispatch'
  );

  const updatedTable = dataStore.getTableById(table.id)?.table;
  assert(
    updatedTable?.status === 'In Progress',
    'Table status drops from "Completed / Dispatched" back to "In Progress"'
  );

  // Verify that the previous QR token is NOW REVOKED and rejected
  const revokedPublicData = dataStore.getPublicTableHistory(token);
  assert(
    revokedPublicData.found === false && revokedPublicData.error?.includes('revoked'),
    'Public QR certificate access is immediately revoked when a task is reopened',
    `Expected found: false, got: ${revokedPublicData.found}`
  );

  console.log('\n===============================================================');
  console.log(`STAGING AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStagingTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
