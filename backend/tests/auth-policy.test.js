import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_STATES,
  canUserLogin,
  getApprovalStatusForRole,
} from "../utils/authPolicy.js";

test("student accounts are auto-approved", () => {
  assert.equal(getApprovalStatusForRole("student"), APPROVAL_STATES.APPROVED);
  assert.equal(canUserLogin({ role: "student" }), true);
});

test("faculty and admin accounts require approval before login", () => {
  assert.equal(getApprovalStatusForRole("faculty"), APPROVAL_STATES.PENDING);
  assert.equal(getApprovalStatusForRole("admin"), APPROVAL_STATES.PENDING);
  assert.equal(canUserLogin({ role: "faculty", approvalStatus: APPROVAL_STATES.PENDING }), false);
  assert.equal(canUserLogin({ role: "admin", approvalStatus: APPROVAL_STATES.APPROVED }), true);
});

test("rejected users are blocked from login", () => {
  assert.equal(canUserLogin({ role: "admin", approvalStatus: APPROVAL_STATES.REJECTED }), false);
});
