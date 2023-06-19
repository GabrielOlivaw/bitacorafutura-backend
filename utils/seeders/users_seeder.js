const mongoose = require('mongoose')
const User = require('../../models/user')

const config = require('../config')

const logger = require('../logger')

const { passwordToHash } = require('../utils')

// USERS SEEDER
// This seeder creates the first user with role SUPERADMIN.
// It has dummy data, so please change everything in the frontend.
// Data to change: username, name, password, email.

const usersSeed = async () => {

  logger.info('Starting the users seeder...')

  mongoose.connect(config.MONGODB_URI, 
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    }
  )

  const username = 'superadmin'
  const password = 'password'

  const passwordHash = await passwordToHash(password)

  logger.info(`Creating superadmin with username ${username} and password ${password}...`)

  const superadmin = new User({
    username: username,
    name: 'Superadmin Name',
    password: passwordHash,
    role: 'SUPERADMIN',
    email: config.BITACORAFUTURA_EMAIL.user
  })

  await superadmin.save()
    .then(() => {
      logger.info('Superadmin created! Please change username, name and ' + 
      'password in the frontend clicking in Edit User page after logging in.')
    })
    .catch(e => {
      logger.info(e.message)
    })

  mongoose.disconnect()
}

usersSeed()