const mongoose = require('mongoose')
const supertest = require('supertest')
const blogHelper = require('./blog_helper')
const userHelper = require('./user_helper')
const bcrypt = require('bcrypt')
const app = require('../app')
const api = supertest(app)
const Blog = require('../models/blog')
const Comment = require('../models/comment')
const User = require('../models/user')

const baseUrl = '/api/blogs'

describe('Multiple blogs in database', () => {
  beforeEach(async () => {
    // Users creation
    await User.deleteMany({})
  
    const passwordHash = await bcrypt.hash('password', 10)
  
    const users = userHelper.initialUsers.map(user => new User({ ...user, password: passwordHash }) )
  
    const usersPromises = users.map(user => user.save())
    await Promise.all(usersPromises)
  
    // Blogs creation
    await Blog.deleteMany({})
  
    const userAuthor = await User.findOne({ role: 'AUTHOR' })
  
    const blogs = blogHelper.initialBlogs.map(blog => new Blog({ ...blog, user: userAuthor.id }))
  
    const blogsPromises = blogs.map(blog => blog.save())
    await Promise.all(blogsPromises)
  
    userAuthor.blogs = userAuthor.blogs.concat(blogs)
    await userAuthor.save()
  })

  test('Both blogs and users are created accordingly', async () => {
    const blogs = await blogHelper.blogsDbJson()
    expect(blogs).toHaveLength(blogHelper.initialBlogs.length)

    const users = await userHelper.usersDbJson()
    expect(users).toHaveLength(userHelper.initialUsers.length)
  })

  describe('Blogs queries', () => {  
    test('Blogs are properly paginated and sorted', async () => {
      const blogsPage = await api
        .get(`${baseUrl}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
  
      const blogsPage2 = await api.get(`${baseUrl}?page=2`)
  
      // FIRST PAGE
      const blogsBody = blogsPage.body
  
      // Start on the first page
      expect(blogsBody.page).toBe(1)
      // Total number of blogs
      expect(blogsBody.totalDocs).toBe(blogHelper.initialBlogs.length)
      // Blogs per page limit
      expect(blogsBody.limit).toBe(5)
      expect(blogsBody.docs).toHaveLength(5)
      // Blogs sorted by creation date descending
      expect(blogsBody.docs[0].title).toBe(
        blogHelper.initialBlogs[blogHelper.initialBlogs.length - 1].title
      )
  
      // SECOND PAGE
      const blogsBody2 = blogsPage2.body
  
      // Start on the second page
      expect(blogsBody2.page).toBe(2)
      // Only one blog on the second page
      expect(blogsBody2.docs).toHaveLength(1)
      // Blogs sorted by creation date descending
      // The only blog in the second page is the last one in pagination and
      // the first one created in db
      expect(blogsBody2.docs[0].title).toBe(blogHelper.initialBlogs[0].title)
    })

    test('Specific blog is correctly shown', async () => {
      const blogTitleToFind = blogHelper.initialBlogs[2].title
      const blog = await Blog.findOne({ title: blogTitleToFind })

      const blogPage = await api
        .get(`${baseUrl}/${blog.id}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(blogPage.body.title).toBe(blogTitleToFind)
    })
  })

  describe('Blogs creations', () => {
    test('Blogs are properly created', async () => {
      // First we login to get the token
      const userAuthor = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userAuthor.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the new blog is created

      const newBlog = {
        title: 'First Olympiads in Greece',
        content: 'Lorem ipsum dolor sit amet greece.'
      }

      await api
        .post(`${baseUrl}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send(newBlog)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      expect(blogsAtEnd).toHaveLength(blogHelper.initialBlogs.length + 1)

      const newBlogFiltered = blogsAtEnd.filter(blog => blog.title === newBlog.title )

      expect(newBlogFiltered).not.toHaveLength(0)
    })

    test('Blogs are not created if insufficient permissions', async () => {
      // First we login to get the token
      const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userUser.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the new blog won't be created due to insufficient permissions

      const newBlog = {
        title: 'Blog without permissions',
        content: 'Lorem ipsum dolor sit amet permissions.'
      }

      // Logged user with role USER
      await api
        .post(`${baseUrl}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Unlogged user
      await api
        .post(`${baseUrl}`)
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      
      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      expect(blogsAtEnd).toHaveLength(blogHelper.initialBlogs.length)
    })
  })

  describe('Blogs editions', () => {
    test('Blogs are properly edited', async () => {
      // First we login to get the token
      const userAuthor = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userAuthor.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the existing blog is edited

      const blogTitleToFind = blogHelper.initialBlogs[1].title
      const editedBlog = await Blog.findOne({ title: blogTitleToFind })

      const newContent = 'RVBICON'
      await api
        .put(`${baseUrl}/${editedBlog.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send({ content: newContent })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      expect(blogsAtEnd).toHaveLength(blogHelper.initialBlogs.length)

      const editedBlogFiltered = blogsAtEnd.filter(blog => blog.id === editedBlog.id )[0]
      expect(editedBlogFiltered.content).toBe(newContent)
    })

    test('Blogs are not edited if insufficient permissions', async () => {
      // First we login to get the token
      const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userUser.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the blog won't be edited due to insufficient permissions

      const blogTitleToFind = blogHelper.initialBlogs[1].title
      const editedBlog = await Blog.findOne({ title: blogTitleToFind })

      const newContent = 'RVBICON'

      // Logged user with role USER
      await api
        .put(`${baseUrl}/${editedBlog.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .send({ content: newContent })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      
      // Unlogged user
      await api
        .put(`${baseUrl}/${editedBlog.id}`)
        .send({ content: newContent })
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      const blogNotEdited = blogsAtEnd.filter(blog => blog.id === editedBlog.id)[0]
      expect(blogNotEdited.content).not.toBe(newContent)
    })
  })

  describe('Blogs deletions', () => {
    test('Blogs are properly deleted', async () => {
      // First we login to get the token
      const userAuthor = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userAuthor.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the existing blog is deleted

      const blogTitleToFind = blogHelper.initialBlogs[1].title
      const deletedBlog = await Blog.findOne({ title: blogTitleToFind })

      await api
        .delete(`${baseUrl}/${deletedBlog.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .expect(204)

      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      expect(blogsAtEnd).toHaveLength(blogHelper.initialBlogs.length - 1)

      const deletedBlogFiltered = blogsAtEnd.filter(blog => blog.id === deletedBlog.id )
      expect(deletedBlogFiltered).toHaveLength(0)
    })

    test('Blogs are not deleted if insufficient permissions', async () => {
      // First we login to get the token
      const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
      const loginRequest = await api
        .post('/api/login')
        .send({ username: userUser.username, password: 'password' })
        .expect(200)
        .expect('Content-Type', /application\/json/)
      
      // Then, the blog won't be deleted due to insufficient permissions

      const blogTitleToFind = blogHelper.initialBlogs[1].title
      const editedBlog = await Blog.findOne({ title: blogTitleToFind })

      // Logged user with role USER
      await api
        .delete(`${baseUrl}/${editedBlog.id}`)
        .set('Authorization', `bearer ${loginRequest.body.token}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      // Unlogged user
      await api
        .delete(`${baseUrl}/${editedBlog.id}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      
      // Lastly, the blogs array is compared with its initial state
      const blogsAtEnd = await blogHelper.blogsDbJson()
      expect(blogsAtEnd).toHaveLength(blogHelper.initialBlogs.length)
    })
  })

  describe('Comments inside a blog', () => {
    beforeEach(async () => {
      await Comment.deleteMany({})

      const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })
      const user = await User.findOne({ role: 'USER' })

      const comments = blogHelper.initialComments.map(comment => 
        new Comment({ ...comment, blog: blog.id, user: user.id })
      )

      // Comments creation

      const commentsPromises = comments.map(comment => comment.save())
      await Promise.all(commentsPromises)

      // Comments added to blog and user

      blog.comments = blog.comments.concat(comments)
      await blog.save()

      user.comments = user.comments.concat(comments)
      await user.save()
      
    })

    test('Comments are created accordingly', async () => {
      const comments = await blogHelper.commentsDbJson()
      expect(comments).toHaveLength(blogHelper.initialComments.length)
    })

    describe('Comments queries', () => {
      test('Comments are properly paginated and sorted', async () => {
        const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })
  
        const commentsPage = await api
          .get(`${baseUrl}/${blog.id}/comments`)
          .expect(200)
          .expect('Content-Type', /application\/json/)
    
        const commentsPage2 = await api.get(`${baseUrl}/${blog.id}/comments?page=2`)
    
        // FIRST PAGE
        const commentsBody = commentsPage.body
    
        // Start on the first page
        expect(commentsBody.page).toBe(1)
        // Total number of comments
        expect(commentsBody.totalDocs).toBe(blogHelper.initialComments.length)
        // Comments per page limit
        expect(commentsBody.limit).toBe(5)
        expect(commentsBody.docs).toHaveLength(5)
        // Comments sorted by creation date descending
        expect(commentsBody.docs[0].comment).toBe(
          blogHelper.initialComments[blogHelper.initialComments.length - 1].comment
        )
    
        // SECOND PAGE
        const commentsBody2 = commentsPage2.body
    
        // Start on the second page
        expect(commentsBody2.page).toBe(2)
        // Only one comment on the second page
        expect(commentsBody2.docs).toHaveLength(1)
        // Comments sorted by creation date descending
        // The only comment in the second page is the last one in pagination and
        // the first one created in db
        expect(commentsBody2.docs[0].comment).toBe(blogHelper.initialComments[0].comment)
      })
    })

    describe('Comments creations', () => {
      test('Comments are properly created', async () => {
        // First we login to get the token
        const userUser = userHelper.initialUsers.filter(user => user.role === 'USER')[0]
        const loginRequest = await api
          .post('/api/login')
          .send({ username: userUser.username, password: 'password' })
          .expect(200)
          .expect('Content-Type', /application\/json/)
        
        const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })

        // Then, the new comment is created
  
        const newComment = {
          comment: 'This is a new comment'
        }
  
        await api
          .post(`${baseUrl}/${blog.id}/comments`)
          .set('Authorization', `bearer ${loginRequest.body.token}`)
          .send(newComment)
          .expect(200)
          .expect('Content-Type', /application\/json/)
  
        // Lastly, the comments array is compared with its initial state
        const commentsAtEnd = await blogHelper.commentsDbJson()
        expect(commentsAtEnd).toHaveLength(blogHelper.initialComments.length + 1)
  
        const newCommentFiltered = commentsAtEnd.filter(comment => comment.comment === newComment.comment )
  
        expect(newCommentFiltered).not.toHaveLength(0)
      })
  
      test('Comments are not created if insufficient permissions', async () => {
        const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })

        // All registered users can comment, so no login needed        
        // Then, the new comment won't be created due to insufficient permissions
  
        const newComment = {
          comment: 'You shall not pass'
        }
  
        // Unlogged user
        await api
          .post(`${baseUrl}/${blog.id}/comments`)
          .send(newComment)
          .expect(401)
          .expect('Content-Type', /application\/json/)
        
        
        // Lastly, the comments array is compared with its initial state
        const commentsAtEnd = await blogHelper.commentsDbJson()
        expect(commentsAtEnd).toHaveLength(blogHelper.initialComments.length)
      })
    })

    describe('Comments deletions', () => {
      test('Comments are properly deleted', async () => {
        // First we login to get the token
        const userAdmin = userHelper.initialUsers.filter(user => user.role === 'ADMIN')[0]
        const loginRequest = await api
          .post('/api/login')
          .send({ username: userAdmin.username, password: 'password' })
          .expect(200)
          .expect('Content-Type', /application\/json/)
        
        const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })

        // Then, the existing comment is deleted
  
        const commentToFind = blogHelper.initialComments[1].comment
        const deletedComment = await Comment.findOne({ comment: commentToFind })
        
        await api
          .delete(`${baseUrl}/${blog.id}/comments/${deletedComment.id}`)
          .set('Authorization', `bearer ${loginRequest.body.token}`)
          .expect(204)
  
        // Lastly, the comments array is compared with its initial state
        const commentsAtEnd = await blogHelper.commentsDbJson()
        expect(commentsAtEnd).toHaveLength(blogHelper.initialComments.length - 1)
  
        const deletedCommentFiltered =
          commentsAtEnd.filter(comment => comment.id === deletedComment.id )
        expect(deletedCommentFiltered).toHaveLength(0)
      })
  
      test('Comments are not deleted if insufficient permissions', async () => {
        // Only an admin or the original user can delete the comment
        // First we login to get the token of an user without permissions
        const userAuthor = userHelper.initialUsers.filter(user => user.role === 'AUTHOR')[0]
        const loginRequest = await api
          .post('/api/login')
          .send({ username: userAuthor.username, password: 'password' })
          .expect(200)
          .expect('Content-Type', /application\/json/)
        
        const blog = await Blog.findOne({ title: blogHelper.initialBlogs[0].title })

        // Then, the comment won't be deleted due to insufficient permissions

        const commentToFind = blogHelper.initialComments[1].comment
        const deletedComment = await Comment.findOne({ comment: commentToFind })
 
        // Logged user without permissions
        await api
          .delete(`${baseUrl}/${blog.id}/comments/${deletedComment.id}`)
          .set('Authorization', `bearer ${loginRequest.body.token}`)
          .expect(401)
          .expect('Content-Type', /application\/json/)
  
        // Unlogged user
        await api
          .delete(`${baseUrl}/${blog.id}/comments/${deletedComment.id}`)
          .expect(401)
          .expect('Content-Type', /application\/json/)
        
        // Lastly, the comments array is compared with its initial state
        const commentsAtEnd = await blogHelper.commentsDbJson()
        expect(commentsAtEnd).toHaveLength(blogHelper.initialComments.length)
      })
    })
  })
})

afterAll(() => {
  mongoose.connection.close()
})