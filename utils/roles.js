const roles = ['USER', 'AUTHOR', 'ADMIN', 'SUPERADMIN']

const hasPermission = (currentRole, minimumRole) => {

  const currentRoleIndex = roles.indexOf(currentRole.toUpperCase())
  const minimumRoleIndex = roles.indexOf(minimumRole.toUpperCase())

  return currentRoleIndex !== -1 && minimumRoleIndex !== -1 && 
    currentRoleIndex >= minimumRoleIndex
}

// Admins or higher can only modify users of inferior roles
const canModifyTargetUserRole = (modifierRole, targetUserRole, newRole) => {

  const modifierRoleIndex = roles.indexOf(modifierRole.toUpperCase())
  const targetRoleIndex = roles.indexOf(targetUserRole.toUpperCase())
  const newRoleIndex = roles.indexOf(newRole.toUpperCase())

  /*
  Restrictions defined in the return:
  - All roles must exist AND modifier user role has to be higher than user to modify
  - If modifier user is ADMIN, he can only grant roles up to AUTHOR
  - If modifier user is SUPERADMIN, he can only grant roles up to ADMIN
  */

  return ((modifierRoleIndex !== -1 && targetRoleIndex !== -1 && newRoleIndex !== -1 && 
          modifierRoleIndex > targetRoleIndex) &&
    (modifierRoleIndex === roles.indexOf('ADMIN') && newRoleIndex <= roles.indexOf('AUTHOR')) ||
    (modifierRoleIndex === roles.indexOf('SUPERADMIN') && newRoleIndex <= roles.indexOf('ADMIN')))
}

exports.roles = roles
exports.hasPermission = hasPermission
exports.canModifyTargetUserRole = canModifyTargetUserRole