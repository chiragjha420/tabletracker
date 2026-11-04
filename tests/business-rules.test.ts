// Automated Business Rules Test Suite for JBB TableTracker
// Verifies Scenarios A through J from PRD Section 15

import { dataStore } from '../lib/data/store';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${message}`);
  }
}

async function runTestSuite() {
  console.log('--- STARTING JBB TABLETRACKER TEST SUITE ---');

  // Register dedicated test users for automated test execution
  dataStore.setSessionUser({
    id: 'user-sales-1',
    full_name: 'Test Sales',
    email: 'test.sales@test.com',
    role: 'SALES',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  dataStore.setSessionUser({
    id: 'user-sup-1',
    full_name: 'Test Supervisor 1',
    email: 'test.sup1@test.com',
    role: 'SUPERVISOR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  dataStore.setSessionUser({
    id: 'user-sup-2',
    full_name: 'Test Supervisor 2',
    email: 'test.sup2@test.com',
    role: 'SUPERVISOR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  dataStore.setSessionUser({
    id: 'user-admin-1',
    full_name: 'Test Admin',
    email: 'test.admin@test.com',
    role: 'ADMIN',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  dataStore.setSessionUser({
    id: 'user-sup-3',
    full_name: 'Test Supervisor 3',
    email: 'test.sup3@test.com',
    role: 'SUPERVISOR',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Assign factory access for test supervisors
  dataStore.setUserFactoryAccess('user-sup-1', ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'], 'b241a576-8872-45f8-a2c7-44a74a2aa6d3');
  dataStore.setUserFactoryAccess('user-sup-2', ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'], 'b241a576-8872-45f8-a2c7-44a74a2aa6d3');
  dataStore.setUserFactoryAccess('user-sup-3', ['a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'], 'b241a576-8872-45f8-a2c7-44a74a2aa6d3');

  // ==========================================
  // SCENARIO A: Table creation by Salesperson
  // ==========================================
  console.log('\nTesting Scenario A: Table creation by Salesperson...');
  const newTable = dataStore.createTable({
    table_name: 'Test Tournament 10ft',
    table_type: 'Snooker',
    reference_photo_path: 'https://example.com/test-snooker.jpg',
    salesperson_id: 'user-sales-1',
    factory_id: 'a0000000-0000-0000-0000-000000000001',
    checklist: [
      { task_name: 'Assemble solid legs', remark: 'Use M12 high tensile bolts' },
      { task_name: 'Slate leveling and honing', remark: '0.1mm tolerance' },
      { task_name: 'Cushion rubber bonding' },
    ],
  });

  assert(!!newTable.id, 'Table must be generated with unique ID');
  assert(newTable.table_code.startsWith('JBB-2026-'), 'Table code format must be JBB-2026-XXX');
  assert(newTable.status === 'Submitted', 'Initial table status must be Submitted');
  assert(newTable.lead_supervisor_id === null, 'Initial lead supervisor must be null');

  const tableDetails = dataStore.getTableById(newTable.id);
  assert(!!tableDetails, 'Created table must be retrievable');
  // Check build tasks count + 1 mandatory dispatch task
  assert(tableDetails!.tasks.length === 4, 'Table must have 3 build tasks + 1 mandatory dispatch task');
  const dispatchTask = tableDetails!.tasks.find(t => t.task_type === 'DISPATCH');
  assert(!!dispatchTask, 'Mandatory Dispatch & Packing task must be automatically included');
  assert(dispatchTask!.task_name === 'Dispatch & Packing', 'Dispatch task must be named Dispatch & Packing');
  console.log('✓ Scenario A Passed: Table and mandatory checklist created correctly.');

  // ==========================================
  // SCENARIO B: Atomic table claiming & race condition
  // ==========================================
  console.log('\nTesting Scenario B: Atomic table claiming...');
  // First supervisor claims
  const claim1 = dataStore.claimTable(newTable.id, 'user-sup-1');
  assert(claim1.success === true, 'First supervisor must successfully claim table');

  // Verify table state changed to In Progress
  const claimedTable = dataStore.getTableById(newTable.id)!.table;
  assert(claimedTable.status === 'In Progress', 'Claimed table status must be In Progress');
  assert(claimedTable.lead_supervisor_id === 'user-sup-1', 'Lead supervisor must be user-sup-1');

  // Second supervisor attempts to claim the same table (Race condition)
  const claim2 = dataStore.claimTable(newTable.id, 'user-sup-2');
  assert(claim2.success === false, 'Second supervisor claim attempt must be rejected atomically');
  console.log('✓ Scenario B Passed: Atomic claiming prevents duplicate lead supervisor assignment.');

  // ==========================================
  // SCENARIO C: Task assignment permissions
  // ==========================================
  console.log('\nTesting Scenario C: Task assignments & accountability...');
  const task1 = tableDetails!.tasks[0];
  const task2 = tableDetails!.tasks[1];

  // Lead supervisor assigns task 1 to supervisor 2
  const assignRes = dataStore.assignTask(task1.id, 'user-sup-2', 'user-sup-1');
  assert(assignRes.success === true, 'Lead supervisor must be able to assign tasks');

  // Non-lead supervisor 3 tries to take over supervisor 2's task without authorization
  const unauthorizedTakeover = dataStore.assignTask(task1.id, 'user-sup-3', 'user-sup-3');
  assert(unauthorizedTakeover.success === false, 'Unauthorized supervisor cannot take over another supervisor task');

  // Supervisor 3 can claim an unassigned task for themselves
  const selfClaim = dataStore.assignTask(task2.id, 'user-sup-3', 'user-sup-3');
  assert(selfClaim.success === true, 'Supervisor can claim unassigned task for themselves');

  // Verify visibility on My Tasks
  const sup2Tasks = dataStore.getSupervisorTasks('user-sup-2');
  assert(sup2Tasks.some(t => t.id === task1.id), 'Task 1 must appear in Supervisor 2 My Tasks');
  console.log('✓ Scenario C Passed: Task assignment rules and accountability verified.');

  // ==========================================
  // SCENARIO D: Task status & mandatory photo evidence
  // ==========================================
  console.log('\nTesting Scenario D: Task start and mandatory completion photo...');
  // Start task 1
  const startRes = dataStore.startTask(task1.id, 'user-sup-2');
  assert(startRes.success === true, 'Assigned supervisor must be able to start task');
  const startedTask = dataStore.getTableById(newTable.id)!.tasks.find(t => t.id === task1.id)!;
  assert(startedTask.status === 'IN_PROGRESS', 'Task status must transition to IN_PROGRESS');
  assert(!!startedTask.started_at, 'Start timestamp must be recorded');

  // Attempt to complete task WITHOUT photo evidence
  const completeWithoutPhoto = dataStore.completeTask(task1.id, 'user-sup-2', '');
  assert(completeWithoutPhoto.success === false, 'Completing task without photo evidence MUST be rejected');

  // Complete task WITH valid photo evidence
  const validPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
  const completeWithPhoto = dataStore.completeTask(task1.id, 'user-sup-2', validPhoto);
  assert(completeWithPhoto.success === true, 'Completing task with photo must succeed');

  const completedTask = dataStore.getTableById(newTable.id)!.tasks.find(t => t.id === task1.id)!;
  assert(completedTask.status === 'COMPLETED', 'Task status must transition to COMPLETED');
  assert(!!completedTask.completed_at, 'Completion timestamp must be recorded');
  assert(completedTask.completed_by === 'user-sup-2', 'Completing supervisor must be recorded');
  assert(completedTask.evidence!.length > 0, 'Completion evidence must be stored');
  console.log('✓ Scenario D Passed: Proof of work enforced; photo strictly mandatory.');

  // ==========================================
  // SCENARIO E: Problem reporting & alert resolution
  // ==========================================
  console.log('\nTesting Scenario E: Reporting a problem and resolving alert...');
  // Start task 2
  dataStore.startTask(task2.id, 'user-sup-3');

  // Attempt to report problem without reason
  const emptyReasonAlert = dataStore.reportProblem(task2.id, 'user-sup-3', '');
  assert(emptyReasonAlert.success === false, 'Reporting problem without reason must fail');

  // Report problem with valid reason
  const reportRes = dataStore.reportProblem(task2.id, 'user-sup-3', 'Cushion profile height mismatch with blueprint');
  assert(reportRes.success === true, 'Problem report with reason must succeed');

  const blockedTask = dataStore.getTableById(newTable.id)!.tasks.find(t => t.id === task2.id)!;
  assert(blockedTask.status === 'BLOCKED', 'Task status must transition to BLOCKED');
  assert(blockedTask.open_issue !== null, 'Open issue must be attached to task');

  // Table status must become Needs Attention
  const attentionTable = dataStore.getTableById(newTable.id)!.table;
  assert(attentionTable.status === 'Needs Attention', 'Table status must prioritize Needs Attention when any task is BLOCKED');

  // Resolve problem
  const resolveRes = dataStore.resolveProblem(task2.id, 'user-sup-1', 'Correct cushion profile supplied from warehouse');
  assert(resolveRes.success === true, 'Problem resolution must succeed');

  const resumedTask = dataStore.getTableById(newTable.id)!.tasks.find(t => t.id === task2.id)!;
  assert(resumedTask.status === 'IN_PROGRESS', 'Task must return to previous workable status IN_PROGRESS');
  console.log('✓ Scenario E Passed: Blocked task alert flow and resolution verified.');

  // ==========================================
  // SCENARIO F: Salesperson editing task
  // ==========================================
  console.log('\nTesting Scenario F: Salesperson edits uncompleted task...');
  const task3 = tableDetails!.tasks[2];
  const editRes = dataStore.editTask(task3.id, 'user-sales-1', {
    task_name: 'Cushion rubber bonding (High Precision)',
    remark: 'Use temperature-controlled adhesive',
  });
  assert(editRes.success === true, 'Salesperson can update uncompleted task');

  const editedTask = dataStore.getTableById(newTable.id)!.tasks.find(t => t.id === task3.id)!;
  assert(editedTask.task_name === 'Cushion rubber bonding (High Precision)', 'Task name must update');
  assert(editedTask.remark === 'Use temperature-controlled adhesive', 'Task remark must update');

  // Attempt to edit completed task directly
  const editCompletedRes = dataStore.editTask(task1.id, 'user-sales-1', { task_name: 'Tampered Name' });
  assert(editCompletedRes.success === false, 'Cannot directly edit completed task instructions without admin reopening');
  console.log('✓ Scenario F Passed: Task editing updates instructions and protects completed records.');

  // ==========================================
  // SCENARIO G: Dispatch gate restriction enforcement
  // ==========================================
  console.log('\nTesting Scenario G: Dispatch restriction enforcement (Backend Gate)...');
  // At this point, task2 and task3 are NOT completed!
  const prematureDispatch = dataStore.completeDispatch(newTable.id, 'user-sup-1', {
    nags_count: 5,
    driver_name: 'Ramesh',
    driver_phone: '+91 99999 88888',
    packed_photo_path: 'data:image/jpeg;base64,...',
  });
  assert(prematureDispatch.success === false, 'Dispatch MUST be rejected when build tasks are incomplete');
  assert(prematureDispatch.message.includes('incomplete'), 'Error message must specify incomplete tasks');
  console.log('✓ Scenario G Passed: Premature dispatch rejected by backend gate.');

  // ==========================================
  // SCENARIO H: Final dispatch & QR generation
  // ==========================================
  console.log('\nTesting Scenario H: Final dispatch completion & QR generation...');
  // Complete remaining build tasks with evidence
  dataStore.completeTask(task2.id, 'user-sup-3', validPhoto);
  dataStore.startTask(task3.id, 'user-sup-1');
  dataStore.completeTask(task3.id, 'user-sup-1', validPhoto);

  const readyTable = dataStore.getTableById(newTable.id)!.table;
  assert(readyTable.status === 'Ready for Dispatch', 'Table status must transition to Ready for Dispatch');

  // Submit final dispatch
  const dispatchRes = dataStore.completeDispatch(newTable.id, 'user-sup-1', {
    nags_count: 6,
    driver_name: 'Sardar Manjit Singh',
    driver_phone: '+91 98111 22334',
    packed_photo_path: 'https://example.com/packed-truck.jpg',
  });
  assert(dispatchRes.success === true, 'Dispatch must succeed when all build tasks are completed');
  assert(!!dispatchRes.qrToken, 'Unique QR token must be generated upon dispatch');

  const finalTable = dataStore.getTableById(newTable.id)!;
  assert(finalTable.table.status === 'Completed / Dispatched', 'Table status must be Completed / Dispatched');
  assert(!!finalTable.table.dispatched_at, 'Dispatched timestamp must be recorded');
  assert(finalTable.dispatch?.nags_count === 6, 'Nags count must be recorded');
  console.log('✓ Scenario H Passed: Final dispatch completed and QR token generated.');

  // ==========================================
  // SCENARIO I: Public QR history verification & security
  // ==========================================
  console.log('\nTesting Scenario I: Public QR history sanitization...');
  const qrHistory = dataStore.getPublicTableHistory(dispatchRes.qrToken!);
  assert(qrHistory.found === true, 'Public QR history must resolve valid token');
  assert(qrHistory.table_name === 'Test Tournament 10ft', 'Table name must be present');
  assert(qrHistory.nags_count === 6, 'Nags count must be present');
  assert(qrHistory.completed_tasks?.length === 4, 'All completed tasks and evidence must be listed');

  // STRICT SECURITY CHECK
  assert((qrHistory as any).driver_phone === undefined, 'Driver phone number MUST NEVER be exposed on public QR page');
  assert((qrHistory as any).open_issue === undefined, 'Private internal alerts must not be exposed');
  console.log('✓ Scenario I Passed: Public QR route is properly sanitized and secured.');

  // ==========================================
  // SCENARIO J: Reopening completed task & QR revocation
  // ==========================================
  console.log('\nTesting Scenario J: Admin reopening completed task & QR revocation...');
  // Non-admin tries to reopen
  const nonAdminReopen = dataStore.reopenTask(task1.id, 'user-sales-1', 'Need rework');
  assert(nonAdminReopen.success === false, 'Only administrators can reopen completed tasks');

  // Admin reopens with mandatory reason
  const adminReopen = dataStore.reopenTask(task1.id, 'user-admin-1', 'Cloth tension failed QC audit');
  assert(adminReopen.success === true, 'Admin reopen with reason must succeed');

  const reopenedTable = dataStore.getTableById(newTable.id)!;
  assert(reopenedTable.table.status !== 'Completed / Dispatched', 'Table must drop out of Completed / Dispatched status');
  const reopenedTask = reopenedTable.tasks.find(t => t.id === task1.id)!;
  assert(reopenedTask.status === 'IN_PROGRESS', 'Reopened task must become IN_PROGRESS');

  // Check QR Access Revocation
  const revokedQrHistory = dataStore.getPublicTableHistory(dispatchRes.qrToken!);
  assert(revokedQrHistory.found === false, 'Existing QR token must be invalidated when a task is reopened');
  console.log('✓ Scenario J Passed: Reopened task drops table from completed and revokes QR access.');

  console.log('\n=============================================');
  console.log('ALL ACCEPTANCE SCENARIOS (A - J) PASSED 100%!');
  console.log('=============================================\n');
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
