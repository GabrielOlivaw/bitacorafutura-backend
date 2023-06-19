const mongoose = require('mongoose')
const supertest = require('supertest')
const userHelper = require('./user_helper')
const bcrypt = require('bcrypt')
const app = require('../app')
const api = supertest(app)
const User = require('../models/user')

const baseUrl = '/api/users'

describe('Multiple users in database', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('password', 10)
  
    const users = userHelper.initialUsers.map(user => new User({ ...user, password: passwordHash }) )
  
    const usersPromises = users.map(user => user.save())
    await Promise.all(usersPromises)
  })

  describe('Users queries', () => {
    
    test('Users are properly shown', async () => {
      const user = userHelper.initialUsers.filter(user => user.role === 'ADMIN')[0]

      const loggedUser = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const usersPage = await api
        .get(`${baseUrl}`)
        .set('Authorization', `bearer ${loggedUser.body.token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
  
      const usersPage2 = await api
        .get(`${baseUrl}?page=2`)
        .set('Authorization', `bearer ${loggedUser.body.token}`)
  
      // FIRST PAGE
      const usersBody = usersPage.body
  
      // Start on the first page
      expect(usersBody.page).toBe(1)
      // Total number of users
      expect(usersBody.totalDocs).toBe(userHelper.initialUsers.length)
      // Users per page limit
      expect(usersBody.limit).toBe(5)
      expect(usersBody.docs).toHaveLength(5)
  
      // SECOND PAGE
      const usersBody2 = usersPage2.body
  
      // Start on the second page
      expect(usersBody2.page).toBe(2)
      // Only one user on the second page
      expect(usersBody2.docs).toHaveLength(1)
    })

    test('Users are not shown if insufficient permissions', async () => {
      // First we login to get the token, non-admin user
      const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userUser.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Logged user with role USER
      await api
        .get(`${baseUrl}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Unlogged user
      await api
        .get(`${baseUrl}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
    })

    test('Logged user check is properly shown', async () => {
      const user = userHelper.initialUsers[0]

      const loggedUser = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      const me = await api
        .get(`${baseUrl}/me`)
        .set('Authorization', `bearer ${loggedUser.body.token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      expect(me.body.username).toBe(user.username)
    })

    test('Logged user role check is properly shown', async () => {
      // Non-admin user
      const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]

      const loggedUser = await api
        .post('/api/login')
        .send({ username: userUser.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      const userIsAdmin = await api
        .get(`${baseUrl}/isadmin`)
        .set('Authorization', `bearer ${loggedUser.body.token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      expect(userIsAdmin.body).toBe(false)

      // Admin user
      const userAdmin = userHelper.initialUsers.filter(user => user.role === 'SUPERADMIN')[0]

      const loggedAdmin = await api
        .post('/api/login')
        .send({ username: userAdmin.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      const adminIsAdmin = await api
        .get(`${baseUrl}/isadmin`)
        .set('Authorization', `bearer ${loggedAdmin.body.token}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      expect(adminIsAdmin.body).toBe(true)
    })
  })

  describe('Users creations', () => {
    test('Users are properly created', async () => {
      const newUser = {
        username: 'createduser',
        name: 'Created User',
        password: 'createduserpassword',
        email: 'createduser@email.com'
      }

      // New user is created

      const createUser = await api
        .post(`${baseUrl}`)
        .send(newUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      const createdUser = createUser.body

      expect(createdUser.username).toBe(newUser.username)
      expect(createdUser.role).toBe('USER')
    })

    test('Users are not created if missing required fields', async () => {
      const newUser = {
        username: 'createduser',
        name: 'Created User',
        password: 'createduserpassword',
        email: 'createduser@email.com'
      }

      // We try to create a new user with each missing field

      const createUserNoUsername = await api
        .post(`${baseUrl}`)
        .send({ ...newUser, username: undefined })
        .expect(400)
        .expect('Content-Type', /application\/json/)
      expect(createUserNoUsername.body.error).toContain('Value `username` is required')

      const createUserNoName = await api
        .post(`${baseUrl}`)
        .send({ ...newUser, name: undefined })
        .expect(400)
      expect(createUserNoName.body.error).toContain('Value `name` is required')

      const createUserNoPassword = await api
        .post(`${baseUrl}`)
        .send({ ...newUser, password: undefined })
        .expect(400)
      expect(createUserNoPassword.body.error).toContain('Value `password` is required')

      const createUserNoEmail = await api
        .post(`${baseUrl}`)
        .send({ ...newUser, email: undefined })
        .expect(400)
      expect(createUserNoEmail.body.error).toContain('Value `email` is required')
    })
  })

  describe('Users editions', () => {
    test('Users are properly edited', async () => {
      // First, we log in with the user we want to edit
      const user = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the logged user is edited

      const userInDb = await User.findOne({ username: user.username })

      const newUsername = 'editedusername'
      const editedUser = await api
        .put(`${baseUrl}/${userInDb.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send({ username: newUsername })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      // Lastly, the edited user is compared with its initial state
      const usersAtEnd = await userHelper.usersDbJson()
      expect(usersAtEnd).toHaveLength(userHelper.initialUsers.length)

      const editedUserFiltered = usersAtEnd.filter(user => user.id === editedUser.body.id )[0]
      expect(editedUserFiltered.username).toBe(newUsername)
      
    })

    test('Users are not edited if insufficient permissions', async () => {
      // First we login to get the token
      const user = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the user won't be edited due to insufficient permissions

      const userToEdit = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const userToEditDb = await User.findOne({ username: userToEdit.username })

      const newUsername = 'editedusername'

      // Logged user different from the user to edit
      await api
        .put(`${baseUrl}/${userToEditDb.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send({ username: newUsername })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      
      // Unlogged user
      await api
        .put(`${baseUrl}/${userToEditDb.id}`)
        .send({ username: newUsername })
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Lastly, the users array is compared with its initial state
      const usersAtEnd = await userHelper.usersDbJson()
      const userNotEdited = usersAtEnd.filter(user => user.id === userToEditDb.id)[0]
      expect(userNotEdited.username).not.toBe(newUsername)
    })
  })

  describe('Users deletions', () => {
    test('Users are properly deleted', async () => {
      // First we login to get the token
      const user = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the existing user is deleted

      const userToDelete = await User.findOne({ username: user.username })

      await api
        .delete(`${baseUrl}/${userToDelete.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .expect(204)

      // Lastly, the users array is compared with its initial state
      const usersAtEnd = await userHelper.usersDbJson()
      expect(usersAtEnd).toHaveLength(userHelper.initialUsers.length - 1)

      const deletedUserFiltered = usersAtEnd.filter(user => user.id === userToDelete.id )
      expect(deletedUserFiltered).toHaveLength(0)
    })

    test('Users are not deleted if insufficient permissions', async () => {
      // First we login to get the token
      const user = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: user.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the user won't be deleted due to insufficient permissions

      const userToDeleteFind = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const userToDelete = await User.findOne({ username: userToDeleteFind.username })

      // Logged user not logged as itself or not admin
      await api
        .delete(`${baseUrl}/${userToDelete.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      // Unlogged user
      await api
        .delete(`${baseUrl}/${userToDelete.id}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Lastly, the users array is compared with its initial state
      const usersAtEnd = await userHelper.usersDbJson()
      expect(usersAtEnd).toHaveLength(userHelper.initialUsers.length)
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})