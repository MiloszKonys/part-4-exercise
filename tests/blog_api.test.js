const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert');
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Blog = require('../models/blog');
const helper = require('./test_helper')
const bcrypt = require('bcrypt')
const User = require('../models/user')

const api = supertest(app)

beforeEach(async () => {  
  await User.deleteMany({})
  await Blog.deleteMany({})

  const passwordHash = await bcrypt.hash('kakakaka', 10)
  const user = new User({
    username: "ssss",
    name: "kkkkk",
    passwordHash,
    blogs: []
  })
  
  const savedUser = await user.save()

  const blogObjects = helper.initialBlogs.map(blog => new Blog({
    ...blog,
    user: savedUser._id,
    likes: blog.likes ? blog.likes : 0
  }))

  const promiseArray = blogObjects.map(blog => blog.save())
  const savedBlogs = await Promise.all(promiseArray)

  savedUser.blogs = savedUser.blogs.concat(savedBlogs.map(blog => blog._id))
  await savedUser.save()
}, 100000)
describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  })

  test('the unique identifier property of the blog posts is named id', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToView = blogsAtStart[0]

    const resultBlog = await api    
      .get(`/api/blogs/${blogToView.id}`)    
      .expect(200)    
      .expect('Content-Type', /application\/json/)

    assert(resultBlog.body.id)
  })
})

describe('viewing a specific blog', () => {
  test('a valid blog can be added by authorized users', async () => {
    const user = {
      username: "ssss",
      password: "kakakaka"
    }

    const loginUser = await api
      .post('/api/login')
      .send(user)

    const newBlog = {
      title: 'Type wars',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      likes: 2
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${loginUser.body.token}`)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

    const titles = blogsAtEnd.map(b => b.title)
    assert(titles.includes('Type wars'))
  }, 100000)

  test('a blog cannot be added by unauthorized users', async () => {
    const newBlog = {
      title: 'Typaaae wars',
      author: 'Robeaaart C. Martin',
      url: 'http://aaablog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      likes: 200
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

    const titles = blogsAtEnd.map(b => b.title)
    assert(!titles.includes('Typaaae wars'))
  }, 100000)

  test('new blog without likes property will be set to 0', async () => {
    const user = {
      username: "ssss",
      password: "kakakaka"
    }

    const loginUser = await api
      .post('/api/login')
      .send(user)

    const newBlog = {
      title: 'Typefghfhgfhg wars',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWarsgfghfhgf.html',
      author: 'Robertdsjflkjfslkd C. Martin'
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${loginUser.body.token}`)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

    const likes = blogsAtEnd.map(b => b.likes)
    assert(likes.includes(0))
  })

  test('new blog without title property will not be added', async () => {
    const user = {
      username: "ssss",
      password: "kakakaka"
    }

    const loginUser = await api
      .post('/api/login')
      .send(user)

    const newBlog = {
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/Typsgfghfhgf.html',
      author: 'Robertdsjflkd C. Martin'
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${loginUser.body.token}`)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })

  test('new blog without url property will not be added', async () => {
    const user = {
      username: "ssss",
      password: "kakakaka"
    }

    const loginUser = await api
      .post('/api/login')
      .send(user)

    const newBlog = {
      title: 'dgfshjdfgsjdh',
      author: 'Robertdsjflkd C. Martin'
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .set('Authorization', `Bearer ${loginUser.body.token}`)
      .expect(400)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
  })
})

describe('deletion of a note', () => {
  test('a blog can be deleted', async () => {
    const user = {
      username: "ssss",
      password: "kakakaka"
    }

    const loginUser = await api
      .post('/api/login')
      .send(user)

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${loginUser.body.token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

    const titles = blogsAtEnd.map(b => b.title)
    assert(!titles.includes(blogToDelete.title))
  })
})

describe('update of a note', () => {
  test('the information of an individual blog post is updated', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToUpdate = blogsAtStart[0]

    const newBlog = {
      ...blogToUpdate,
      likes: 2000000
    }

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

    const likes = blogsAtEnd.map(b => b.likes)
    assert(likes.includes(2000000))
  })
})

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'miaa',
      name: 'miadhfkjsdhf',
      password: 'moimoi'
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })

  test('creation fails with proper statuscode and message if username does not exist', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Ssdsduper',
      password: 'salainen'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password and username must be given'))

    const usersAtEnd = await helper.usersInDb()
    assert.deepStrictEqual(usersAtEnd, usersAtStart)
  })

  test('creation fails with proper statuscode and message if password does not exist', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      name: 'Ssdsduper',
      username: 'salainen'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password and username must be given'))

    const usersAtEnd = await helper.usersInDb()
    assert.deepStrictEqual(usersAtEnd, usersAtStart)
  })

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Super',
      password: 'salainen'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('expected `username` to be unique'))

    const usersAtEnd = await helper.usersInDb()
    assert.deepStrictEqual(usersAtEnd, usersAtStart)
  })

  test('creation fails with proper statuscode and message if username is less than 3 characters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'ro',
      name: 'Sususususu',
      password: 'salainen'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password or username must be at least 3 characters long'))

    const usersAtEnd = await helper.usersInDb()
    assert.deepStrictEqual(usersAtEnd, usersAtStart)
  })

  test('creation fails with proper statuscode and message if password is less than three characters', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'kakakaka',
      name: 'Superkakakak',
      password: 'sa'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password or username must be at least 3 characters long'))

    const usersAtEnd = await helper.usersInDb()
    assert.deepStrictEqual(usersAtEnd, usersAtStart)
  })
})

after(async () => {
  await mongoose.connection.close()
})
