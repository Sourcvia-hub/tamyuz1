/**
 * Role-Based Access Control (RBAC) Permission System - Frontend
 */

export const Permission = {
  NO_ACCESS: 'no_access',
  VIEWER: 'viewer',
  REQUESTER: 'requester',
  VERIFIER: 'verifier',
  APPROVER: 'approver',
  CONTROLLER: 'controller'
};

export const Module = {
  DASHBOARD: 'dashboard',
  VENDORS: 'vendors',
  VENDOR_DD: 'vendor_dd',
  TENDERS: 'tenders',
  TENDER_EVALUATION: 'tender_evaluation',
  TENDER_PROPOSALS: 'tender_proposals',
  CONTRACTS: 'contracts',
  PURCHASE_ORDERS: 'purchase_orders',
  RESOURCES: 'resources',
  INVOICES: 'invoices',
  ASSETS: 'assets',
  SERVICE_REQUESTS: 'service_requests'
};

const ROLE_PERMISSIONS = {
  user: {
    [Module.DASHBOARD]: [Permission.VIEWER],
    [Module.VENDORS]: [Permission.VIEWER],
    [Module.VENDOR_DD]: [Permission.VIEWER],
    [Module.TENDERS]: [Permission.REQUESTER],
    [Module.TENDER_EVALUATION]: [Permission.REQUESTER],
    [Module.TENDER_PROPOSALS]: [Permission.VIEWER],
    [Module.CONTRACTS]: [Permission.REQUESTER],
    [Module.PURCHASE_ORDERS]: [Permission.REQUESTER],
    [Module.RESOURCES]: [Permission.REQUESTER],
    [Module.INVOICES]: [Permission.VERIFIER],
    [Module.ASSETS]: [Permission.NO_ACCESS],
    [Module.SERVICE_REQUESTS]: [Permission.REQUESTER]
  },
  direct_manager: {
    [Module.DASHBOARD]: [Permission.VIEWER],
    [Module.VENDORS]: [Permission.VIEWER],
    [Module.VENDOR_DD]: [Permission.VIEWER],
    [Module.TENDERS]: [Permission.VERIFIER],
    [Module.TENDER_EVALUATION]: [Permission.VERIFIER],
    [Module.TENDER_PROPOSALS]: [Permission.VIEWER],
    [Module.CONTRACTS]: [Permission.VERIFIER],
    [Module.PURCHASE_ORDERS]: [Permission.VERIFIER],
    [Module.RESOURCES]: [Permission.VERIFIER],
    [Module.INVOICES]: [Permission.VERIFIER],
    [Module.ASSETS]: [Permission.NO_ACCESS],
    [Module.SERVICE_REQUESTS]: [Permission.REQUESTER]
  },
  procurement_officer: {
    [Module.DASHBOARD]: [Permission.VIEWER],
    [Module.VENDORS]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.VENDOR_DD]: [Permission.REQUESTER],
    [Module.TENDERS]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.TENDER_EVALUATION]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.TENDER_PROPOSALS]: [Permission.REQUESTER],
    [Module.CONTRACTS]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.PURCHASE_ORDERS]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.RESOURCES]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.INVOICES]: [Permission.REQUESTER, Permission.VERIFIER],
    [Module.ASSETS]: [Permission.REQUESTER],
    [Module.SERVICE_REQUESTS]: [Permission.REQUESTER, Permission.VERIFIER]
  },
  senior_manager: {
    [Module.DASHBOARD]: [Permission.VIEWER],
    [Module.VENDORS]: [Permission.VIEWER],
    [Module.VENDOR_DD]: [Permission.VIEWER],
    [Module.TENDERS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.TENDER_EVALUATION]: [Permission.APPROVER, Permission.VIEWER],
    [Module.TENDER_PROPOSALS]: [Permission.VIEWER],
    [Module.CONTRACTS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.PURCHASE_ORDERS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.RESOURCES]: [Permission.APPROVER, Permission.VIEWER],
    [Module.INVOICES]: [Permission.APPROVER, Permission.VIEWER],
    [Module.ASSETS]: [Permission.NO_ACCESS],
    [Module.SERVICE_REQUESTS]: [Permission.REQUESTER]
  },
  procurement_manager: {
    [Module.DASHBOARD]: [Permission.VIEWER],
    [Module.VENDORS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.VENDOR_DD]: [Permission.APPROVER, Permission.VIEWER],
    [Module.TENDERS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.TENDER_EVALUATION]: [Permission.APPROVER, Permission.VIEWER],
    [Module.TENDER_PROPOSALS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.CONTRACTS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.PURCHASE_ORDERS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.RESOURCES]: [Permission.APPROVER, Permission.VIEWER],
    [Module.INVOICES]: [Permission.APPROVER, Permission.VIEWER],
    [Module.ASSETS]: [Permission.APPROVER, Permission.VIEWER],
    [Module.SERVICE_REQUESTS]: [Permission.APPROVER, Permission.VIEWER]
  },
  admin: {
    [Module.DASHBOARD]: [Permission.CONTROLLER],
    [Module.VENDORS]: [Permission.CONTROLLER],
    [Module.TENDERS]: [Permission.CONTROLLER],
    [Module.CONTRACTS]: [Permission.CONTROLLER],
    [Module.PURCHASE_ORDERS]: [Permission.CONTROLLER],
    [Module.RESOURCES]: [Permission.CONTROLLER],
    [Module.INVOICES]: [Permission.CONTROLLER],
    [Module.ASSETS]: [Permission.CONTROLLER],
    [Module.SERVICE_REQUESTS]: [Permission.CONTROLLER]
  }
};

export const hasPermission = (userRole, module, requiredPermission) => {
  if (!userRole) return false;
  
  // Admin has all permissions
  if (userRole === 'admin') return true;
  
  const rolePerms = ROLE_PERMISSIONS[userRole] || {};
  const modulePerms = rolePerms[module] || [Permission.NO_ACCESS];
  
  if (modulePerms.includes(Permission.NO_ACCESS)) return false;
  if (modulePerms.includes(Permission.CONTROLLER)) return true;
  
  return modulePerms.includes(requiredPermission);
};

export const canAccessModule = (userRole, module) => {
  const rolePerms = ROLE_PERMISSIONS[userRole] || {};
  const modulePerms = rolePerms[module] || [Permission.NO_ACCESS];
  return !modulePerms.includes(Permission.NO_ACCESS);
};

export const getUserPermissions = (userRole, module) => {
  if (userRole === 'admin') return [Permission.CONTROLLER];
  const rolePerms = ROLE_PERMISSIONS[userRole] || {};
  return rolePerms[module] || [Permission.NO_ACCESS];
};

export const canCreate = (userRole, module) => {
  return hasPermission(userRole, module, Permission.REQUESTER) ||
         hasPermission(userRole, module, Permission.CONTROLLER);
};

export const canEdit = (userRole, module) => {
  const perms = getUserPermissions(userRole, module);
  return perms.some(p => [Permission.REQUESTER, Permission.VERIFIER, Permission.APPROVER, Permission.CONTROLLER].includes(p));
};

export const canDelete = (userRole, module) => {
  return hasPermission(userRole, module, Permission.CONTROLLER) ||
         hasPermission(userRole, module, Permission.APPROVER);
};

export const canVerify = (userRole, module) => {
  return hasPermission(userRole, module, Permission.VERIFIER) ||
         hasPermission(userRole, module, Permission.APPROVER) ||
         hasPermission(userRole, module, Permission.CONTROLLER);
};

export const canApprove = (userRole, module) => {
  return hasPermission(userRole, module, Permission.APPROVER) ||
         hasPermission(userRole, module, Permission.CONTROLLER);
};

export const isViewerOnly = (userRole, module) => {
  const perms = getUserPermissions(userRole, module);
  return perms.length === 1 && perms[0] === Permission.VIEWER;
};
