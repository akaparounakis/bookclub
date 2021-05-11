// Express
const express = require('express')
const app = express()
const port = 3000

// SQLITE3 Database
const db = require('./db/dbconn.js')
let tableName = "books"
let tableCreationQuery = `
    CREATE TABLE ${tableName} (
        id INTEGER NOT NULL PRIMARY KEY,
        author TEXT NOT NULL,
        title TEXT NOT NULL,
        genre TEXT NOT NULL,
        price FLOAT NOT NULL
    );`

db.run(tableCreationQuery, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log(`"${tableName}" table was created successfully.`)
})

// Json Parser
const jsonParser = express.json()

// Jsonschema validator
const Validator = require('jsonschema').Validator
const v = new Validator()
const bookInsertionRequestSchema = require('./models/bookInsertionRequest.json')

// Routes
app.get('/', (req, res) => { indexController() })

app.post('/books', jsonParser, (req, res) => { booksPostController(req, res) })

app.get('/books', (req, res) => { booksGetController(req, res) })

// Controllers
const indexController = () => {
    res.send(`Bookclub is listening at http://localhost:${port} `)
}

const booksPostController = async (req, res) => {

    // Validate the request body
    let validity = v.validate(req.body, bookInsertionRequestSchema).valid
    if (!validity) {
        res.json({
            book_insertion: false,
            message: "Post request for book insertion not valid."
        })
    }

    // Create a "local" book obj
    let newBook = {
        author: req.body.data.attributes.author,
        title: req.body.data.attributes.title,
        genre: req.body.data.attributes.genre,
        price: req.body.data.attributes.price
    }

    // Insert the new book into the Database
    const insertion = await insertBook(newBook)
    if (insertion) {
        res.json({
            book_insertion: true,
            message: "Insertion successfull."
        })
    } else {
        res.json({
            book_insertion: false,
            message: insertion
        })
    }
}

const booksGetController = async (req, res) => {

    // Check for a keyword
    // DISCLAIMER: The keyword should be sanitized here.
    const keyword = req.query.keyword
    if (keyword) {

        // Do the search and return the results
        const search = await searchByKeyword(keyword)
        res.json({
            books: search
        })
    } else {
        // Otherwise return all of the available books
        const search = await returnAllBooks()
        res.json({
            books: search
        })
    }
}

// Database Interaction Functions
function insertBook(book) {

    return new Promise((resolve, reject) => {

        // Prepare the sql insertion query
        let insertionQuery = `
            INSERT INTO ${tableName}(author, title, genre, price) 
            VALUES(?, ?, ?, ?)
        `
        db.run(insertionQuery, [book.author, book.title, book.genre, book.price], (err) => {
            if (err) {
                reject(err.message)
            }
            resolve(true)
        })
    })
}

function searchByKeyword(keyword) {

    return new Promise((resolve, reject) => {

        // Prepare the sql search query
        let searchQuery = `
            SELECT id, author, title, genre, price 
            FROM ${tableName}
            WHERE title LIKE ?
        `
        db.all(searchQuery, ['%' + keyword + '%'], (err, rows) => {
            if (err) {
                reject(err.message)
            }
            resolve(rows)
        })
    })
}

function returnAllBooks() {

    return new Promise((resolve, reject) => {

        let showAllQuery = `
            SELECT *
            FROM ${tableName}
        `
        db.all(showAllQuery, [], (err, rows) => {
            if (err) {
                reject(err.message)
            }
            resolve(rows)
        })
    })
}

// Start the server
app.listen(port, () => {
    console.log(`Bookclub is listening at http://localhost:${port}`)
})