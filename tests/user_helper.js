const User = require('../models/user')

const initialUsers = [
  {
    username: 'author',
    name: 'Testing Author',
    email: 'testingauthor@email.com',
    role: 'AUTHOR'
  },
  {
    username: 'user',
    name: 'Testing User',
    email: 'testinguser@email.com',
    role: 'USER'
  },
  {
    username: 'admin',
    name: 'Testing Admin',
    email: 'testingadmin@email.com',
    role: 'ADMIN'
  },
  {
    username: 'superadmin',
    name: 'Testing Superadmin',
    email: 'testingsuperadmin@email.com',
    role: 'SUPERADMIN'
  },
  {
    username: 'user2',
    name: 'Testing User2',
    email: 'testinguser2@email.com',
    role: 'USER'
  },
  {
    username: 'user3',
    name: 'Testing User3',
    email: 'testinguser3@email.com',
    role: 'USER'
  }
]

const usersDbJson = async () => {
  const users = await User.find({})
  return users.map(user => user.toJSON())
}

module.exports = {
  initialUsers, usersDbJson
}