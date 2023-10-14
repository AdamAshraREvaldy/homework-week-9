var express = require('express');
var app = express();
var pool = require('./queries.js');
var jwt = require('jsonwebtoken');
var morgan = require('morgan');


const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

app.use(morgan('common'));
app.use(express.json());
// Secret key jwt
const secretKey = 'inisangatrahasia';

// Middleware untuk memeriksa token JWT
function verifyToken(req, res, next) {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ message: 'Tidak ada token, akses ditolak' });
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(403).json({ message: 'Token tidak valid' });
    }
}

// Register
app.post('/register', (req, res) => {
    const { email, password } = req.body;
    pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password], (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Registration failed' });
        } else {
            const token = jwt.sign({ email: email }, secretKey, { expiresIn: '1h' });
            res.status(201).json({ message: 'User registered successfully', token: token });
        }
    });
});

// Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password], (error, results) => {
        if (error || results.rows.length === 0) {
            res.status(401).json({ message: 'Authentication failed' });
        } else {
            const token = jwt.sign({ email: email }, secretKey, { expiresIn: '1h' });
            res.status(200).json({ message: 'Authentication successful', token: token });
        }
    });
});

// GET users
app.get('/users', verifyToken, (req, res) => {
    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Error fetching users' });
        } else {
            res.status(200).json(results.rows);
        }
    });
});

// paginasi user
app.get('/users/paginated', verifyToken, (req, res) => {
    const page = req.query.page || 1; 
    const limit = req.query.limit || 10; 

    const offset = (page - 1) * limit; 

    // Menghitung jumlah total data
    pool.query('SELECT COUNT(*) FROM users', (error, countResult) => {
        if (error) {
            return res.status(500).json({ message: 'Error counting users' });
        }

        const totalUsers = countResult.rows[0].count;

        // Mengambil data users sesuai halaman dan limit
        pool.query('SELECT * FROM users OFFSET $1 LIMIT $2', [offset, limit], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Error fetching users' });
            }

            const response = {
                totalUsers: totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: page,
                users: results.rows,
            };

            res.status(200).json(response);
        });
    });
});



// POST users
app.post('/users', verifyToken, (req, res) => {
    const { email, password } = req.body;
    pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password], (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Error creating user' });
        } else {
            res.status(201).json({ message: 'User created successfully' });
        }
    });
});

// PUT users/:id
app.put('/users/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { email, password } = req.body;
    pool.query('UPDATE users SET email = $1, password = $2 WHERE id = $3', [email, password, id], (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Error updating user' });
        } else {
            res.status(200).json({ message: 'User updated successfully' });
        }
    });
});

// DELETE users/:id
app.delete('/users/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Error deleting user' });
        } else {
            res.status(200).json({ message: 'User deleted successfully' });
        }
    });
});


// movies
// paginasi movies
app.get('/movies/paginated', verifyToken, (req, res) => {
    const page = req.query.page || 1; 
    const limit = req.query.limit || 10; 

    const offset = (page - 1) * limit; 

    // Menghitung jumlah total data
    pool.query('SELECT COUNT(*) FROM movies', (error, countResult) => {
        if (error) {
            return res.status(500).json({ message: 'Error counting movies' });
        }

        const totalMovies = countResult.rows[0].count;

        // Mengambil data movies sesuai halaman dan limit
        pool.query('SELECT * FROM movies OFFSET $1 LIMIT $2', [offset, limit], (error, results) => {
            if (error) {
                return res.status(500).json({ message: 'Error fetching movies' });
            }

            const response = {
                totalMovies: totalMovies,
                totalPages: Math.ceil(totalMovies / limit),
                currentPage: page,
                movies: results.rows,
            };

            res.status(200).json(response);
        });
    });
});


// swagger

const options = {
    definition: {
        openapi: '3.0.0', 
        info: {
        title: 'Your API Documentation',
        version: '1.0.0',
        description: 'API documentation for your RESTful API with authentication.',
    },
    servers: [
        {
            url: 'http://localhost:3000', 
        },
    ],
    },
    apis: ['./routes/doc.js'], 
};

    const swaggerSpec = swaggerJSDoc(options);

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// cek connect database
pool.connect((err, res) =>{
    if (err) {
        console.log('Database connection error:', err);
    } else {
        console.log('Connected to the database!');
    }
});

app.listen(3000);
