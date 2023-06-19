const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')
const UserToken = require('../models/usertoken')
const crypto = require('crypto')
const AuthenticationError = require('../utils/errors/AuthenticationError')
const UnknownResourceError = require('../utils/errors/UnknownResourceError')

const config = require('../utils/config')
const { passwordToHash } = require('../utils/utils')
const { sendEmail } = require('../utils/email')

loginRouter.post('/', async (request, response) => {
  const body = request.body

  const user = await User.findOne({ username: body.username })
  const correctPassword = user === null
    ? false
    : await bcrypt.compare(body.password, user.password)
  
  if (!user || !correctPassword) {
    throw new AuthenticationError(request.t('login-error-authentication'))
  }
  const userForToken = {
    username: user.username,
    id: user._id
  }

  const token = jwt.sign(userForToken, process.env.SECRET)

  response.status(200).send({ token, username: user.username, name: user.name, })
})

loginRouter.post('/passwordreset', async (request, response) => {

  const user = await User.findOne({ email: request.body.email })
  if (!user) {
    throw new UnknownResourceError(request.t('login-error-email'))
  }

  let token = await UserToken.findOne({ userId: user.id })
  if (!token) {
    token = new UserToken({
      userId: user.id,
      token: crypto.randomBytes(32).toString('hex')
    })
    await token.save()
  }

  const frontLink = `${config.BASEURL_FRONT}/passwordreset/${user.id}/${token.token}`

  sendEmail(user.email, request.t('login-passwordreset-email-subject'),
    request.t('login-passwordreset-email-content', { frontLink }))

  response.send(request.t('login-success-passwordreset-email'))
})

loginRouter.post('/passwordreset/:id/:token', async (request, response) => {

  const userId = request.params.id
  const token = request.params.token
  const newPassword = request.body.password

  const user = await User.findById(userId)
  if (!user) {
    throw new UnknownResourceError(request.t('login-error-passwordreset-id'))
  }

  const userToken = await UserToken.findOne({ userId: user.id, token })
  if (!userToken) {
    throw new UnknownResourceError(request.t('login-error-passwordreset-token'))
  }

  if (!newPassword) {
    throw new AuthenticationError(request.t('login-error-passwordreset-password'))
  }

  const passwordHash = await passwordToHash(newPassword)

  user.password = passwordHash
  
  await user.save()

  await userToken.delete()

  response.send(request.t('login-success-passwordreset'))
})

module.exports = loginRouter