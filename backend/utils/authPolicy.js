export const APPROVAL_STATES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const getApprovalStatusForRole = (role = "student") => {
  if (role === "faculty" || role === "admin") {
    return APPROVAL_STATES.PENDING;
  }

  return APPROVAL_STATES.APPROVED;
};

export const canUserLogin = (user) => {
  const approvalStatus = user?.approvalStatus || getApprovalStatusForRole(user?.role);
  return approvalStatus === APPROVAL_STATES.APPROVED;
};

export const getApprovalMessage = (approvalStatus) => {
  switch (approvalStatus) {
    case APPROVAL_STATES.PENDING:
      return "Your account is awaiting admin approval.";
    case APPROVAL_STATES.REJECTED:
      return "Your account has been rejected. Please contact the administrator.";
    default:
      return "Your account is active.";
  }
};
