type User = {
  permissions: string[]
  roles: string[]
}

type ValidateUserPermissionParams = {
  user: User
  permissions?: string[]
  roles?: string[]
}

export function validateUserPermission({ user, permissions, roles }: ValidateUserPermissionParams) {
  if (permissions?.length > 0) {
    const hasAllPermissions = permissions.every(permission => {
      return user.permissions.includes(permission)
    })

    if (!hasAllPermissions) {
      return false
    }
  }

  if (roles?.length > 0) {
    const hasAllRoles = roles.every(roles => {
      return user.roles.includes(roles)
    })

    if (!hasAllRoles) {
      return false
    }
  }

  return true
}