import express from "express";
import mysql from 'mysql2/promise';
import cors from 'cors';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";

const app = express();

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.json({ error: "Authentication Error" });
    } else {
        jwt.verify(token, "jwtsecretkey", (err, decoded) => {
            if (err) {
                return res.json({ error: "Token Correction Error" });
            } else {
                req.name = decoded.name; 
                next();
            }
        });
    }
};

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true 
}));

const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'MyLocalDB',
    password: 'Narek2006)21'
});

console.log('Connected to database');

app.get('/api/books', async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT * FROM books');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Error fetching books' });
    }
});

app.post('/api/order', verifyUser, async (req, res) => {
    const { username, address, payment_method, total_price } = req.body;
  
    try {
      const [result] = await connection.execute(
        'INSERT INTO orders (username, address, payment_method, total_price) VALUES (?, ?, ?, ?)',
        [username, address, payment_method, total_price]
      );
  
      res.json({ status: 'Success', message: 'Order placed successfully!' });
    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ error: 'Error placing order' });
    }
  });

app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await connection.execute('SELECT * FROM books WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Book not found' });
        }
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).json({ error: 'Error fetching book details' });
    }
});

app.get('/', verifyUser, (req, res) => {
    return res.json({ status: "Success", name: req.name });
});

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const [existingUser] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username is already taken' });
        }

        const [existingEmail] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ id: result.insertId, message: 'User registered successfully' });
        console.log('User registered successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [data] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (data.length === 0) {
            return res.status(404).json({ error: "Username not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, data[0].password);

        if (isPasswordValid) {
            const name = data[0].username;
            const token = jwt.sign({ name }, "jwtsecretkey", { expiresIn: '1d' });
            
            res.cookie('token', token);

            console.log("User logged successfully");

            return res.json({ status: "Success", message: "Login successful", name });
        } else {
            return res.status(401).json({ error: "Invalid password" });
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Error logging in user' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token'); 
    res.json({ status: "Success", message: "Logged out successfully" });
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});


