const usersRouter = require('express').Router()
const User = require('../models/user')
const logger = require('../utils/logger')
const { hasPermission, canModifyTargetUserRole } = require('../utils/roles')
const { passwordToHash } = require('../utils/utils')
const middleware = require('../utils/middleware')

const { sendEmail } = require('../utils/email')

const AuthenticationError = require('../utils/errors/AuthenticationError')
const UnknownResourceError = require('../utils/errors/UnknownResourceError')
const PermissionError = require('../utils/errors/PermissionError')

usersRouter.get('/', middleware.userExtractor, async (request, response) => {
  const loggedUser = await User.findById(request.user)

  if (!loggedUser || !hasPermission(loggedUser.role, 'ADMIN')) {
    throw new PermissionError(request.t('users-error-list'))
  }

  const paginationLimit = 5
  const paginationPage = request.query.page || 1

  const queryOptions = {
    limit: paginationLimit,
    offset: paginationLimit * (paginationPage - 1),
    select: 'username name role email',
    sort: { roleSort: -1 }
  }

  let userFind = {}

  // Search parameter

  const userSearch = request.query.search ? request.query.search.trim() : ''

  if (userSearch) {
    userFind.$or = [
      { username: { $regex: new RegExp(`.*${userSearch}.*`, 'i') } },
      { name: { $regex: new RegExp(`.*${userSearch}.*`, 'i') } },
      { email: { $regex: new RegExp(`.*${userSearch}.*`, 'i') } }
    ]
  }

  const users = await User.paginate(userFind, queryOptions)
  if (users) {
    response.json(users)
  }
  else {
    next()
  }
})

usersRouter.get('/me', middleware.userExtractor, async (request, response) => {
  const user = await User.findById(request.user).select('username name role email')

  response.json(user)
})
// Check React protected routes
usersRouter.get('/isadmin', middleware.userExtractor, async (request, response) => {
  const user = await User.findById(request.user).select('role')

  response.json(hasPermission(user.role, 'ADMIN'))
})

usersRouter.post('/', async (request, response) => {
  const body = request.body

  if (!body.password) {
    throw new AuthenticationError(request.t('users-error-form-password-required'))
  }
  
  const passwordHash = await passwordToHash(body.password, request.t)

  const user = new User({
    username: body.username,
    name: body.name,
    password: passwordHash,
    role: 'USER',
    email: body.email,
    // DEBUG role: body.role
  })

  const savedUser = await user.save()

  const emailText = request.t('users-create-email-content', { username: user.name })

  sendEmail(
    user.email, 
    request.t('users-create-email-subject', { username: user.name }),
    emailText
  )

  response.json(savedUser)
  
})

usersRouter.put('/:id', middleware.userExtractor, async (request, response) => {
  const userToModify = await User.findById(request.params.id).select('username name role email')

  const userModifier = await User.findById(request.user)

  if (!userToModify) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (userToModify.id !== userModifier.id) {
    throw new PermissionError(request.t('users-error-edit'))
  }

  const username = request.body.username
  const name = request.body.name
  const password = request.body.password
  const email = request.body.email

  if (username) userToModify.username = username
  if (name) userToModify.name = name
  if (password) {
    const passwordHash = await passwordToHash(password, request.t)
    userToModify.password = passwordHash
  }
  if (email) userToModify.email = email
  
  await userToModify.save()

  response.json(userToModify)
})

usersRouter.put('/:id/role', middleware.userExtractor, async (request, response) => {
  const userToModify = await User.findById(request.params.id)

  const userModifier = await User.findById(request.user)

  const newRole = request.body.newRole

  if (!userToModify || !newRole) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (!hasPermission(userModifier.role, 'ADMIN')) {
    throw new PermissionError(request.t('users-error-role'))
  }
  if (!canModifyTargetUserRole(userModifier.role, userToModify.role, newRole)) {
    throw new PermissionError(request.t('users-error-edit-role'))
  }

  userToModify.role = request.body.newRole
  
  await userToModify.save()

  return response.json(userToModify)
})

usersRouter.delete('/:id', middleware.userExtractor, async (request, response) => {
  const userToDelete = await User.findById(request.params.id)

  const userDeleter = await User.findById(request.user)

  if (!userToDelete) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (userToDelete.role === 'SUPERADMIN') {
    throw new PermissionError(request.t('users-error-delete-superadmin'))
  }
  if (userToDelete._id.toString() !== userDeleter._id.toString() && !hasPermission(userDeleter.role, 'ADMIN')) {
    throw new PermissionError(request.t('users-error-delete-user'))
  }
  await userToDelete.delete()
  response.status(204).end()
})

module.exports = usersRouter
