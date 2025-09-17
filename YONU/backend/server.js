require('dotenv').config();
// app.use(express.static(path.join(__dirname, '../frontend')));
// const path = require('path');

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const https = require('https');

// Import ShipRocket integration
const {
  createShipRocketOrder,
  trackShipRocketOrder,
  generateShippingLabel,
  schedulePickup,
  getAvailableCouriers,
  cancelShipRocketOrder,
  getShipRocketOrderDetails
} = require('./shiprocket-integration');

// Import pickup details
const shiprocketIntegration = require('./shiprocket-integration');
const PICKUP_DETAILS = shiprocketIntegration.PICKUP_DETAILS || {
  location: 'Aditya Empress Heights',
  person_name: 'Imroze',
  address: 'Flat no 510, Aditya Empress Heights, Vivekananda Nagar, Shaikpet',
  address_2: 'Opposite Aditya Villas 7 tombs road',
  city: 'Hyderabad',
  state: 'Telangana',
  pincode: '500008',
  country: 'India'
};

const app = express();
const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors({
//   origin: process.env.CORS_ORIGIN || '*' // For production, set CORS_ORIGIN to your frontend domain
// }));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'a-very-insecure-secret-key-change-it',
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: process.env.NODE_ENV === 'production' } // Set to true in production with HTTPS
// }));

// // In-memory store for reset codes (email -> { code, expires })
// const resetCodes = new Map();

// // Nodemailer transporter setup (configure with your email service)
// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // Helper function to send email
// const sendEmail = async (to, subject, text) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to,
//     subject,
//     text
//   };

//   try {
//     const result = await transporter.sendMail(mailOptions);
//     console.log('Email sent result:', result);
//     return result;
//   } catch (error) {
//     console.error('Transporter sendMail error:', error);
//     // Check if it's an authentication error
//     if (error.code === 'EAUTH') {
//       console.error('Email authentication failed. Check EMAIL_USER and EMAIL_PASS in .env');
//     }
//     throw error;
//   }
// };

// // SMS sending function using Meta's WhatsApp Cloud API for OTP or SMS
// const sendSMS = async (phone, message) => {
//   try {
//     const response = await axios.post(
//       `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
//       {
//         messaging_product: 'whatsapp',
//         to: phone,
//         type: 'text',
//         text: {
//           body: message
//         }
//       },
//       {
//         headers: {
//           'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('WhatsApp message sent successfully:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error('Error sending WhatsApp message:', error);
//     throw error;
//   }
// };





// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'yono-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// In-memory store for reset codes (email -> { code, expires, isAdmin })
const resetCodes = new Map();

// Nodemailer transporter setup (configure with your email service)
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send email
const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };
  return transporter.sendMail(mailOptions);
};

// SMS sending function using Meta's WhatsApp Cloud API for OTP or SMS
const sendSMS = async (phone, message) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};









// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../frontend/uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG files are allowed!'), false);
    }
  }
});

// MySQL Connection

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root@123',
  database: process.env.DB_DATABASE || 'Yono'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'fa8782cb1aff990ed62e64d2d2ffd56facfe93f4dc29ca080f8027111185298b645ed5260146064c803304afec8631a83e902858d49f91df297308ee29e6a7de';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// API Routes

// Get all products with variants
app.get('/api/products', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category_id: row.category_id,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    res.json(Object.values(products));
  });
});

// Get bars/products for "You'll definitely love this!" section
app.get('/api/bars', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE c.name IN ('Chocolate Energy Bars', 'Roasted Energy Bars', 'Protein & Nut Bars')
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category_id: row.category_id,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    res.json(Object.values(products));
  });
});

// Get chocolate bars for the "You'll definitely love this!" section
app.get('/api/chocolate-bars', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE c.name = 'Chocolate Energy Bars'
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category_id: row.category_id,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    const productsArray = Object.values(products);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productsArray));
  });
});

// Get roasted bars for the "Roasted Nuts" section
app.get('/api/roasted-bars', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE c.name = 'Roasted Energy Bars'
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category_id: row.category_id,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    const productsArray = Object.values(products);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productsArray));
  });
});

// Get protein bars for the "Protein Bars" section
app.get('/api/protein-bars', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE c.name = 'Protein & Nut Bars'
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    const productsArray = Object.values(products);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(productsArray));
  });
});



// User registration
app.post('/api/register', async (req, res) => {
  const { first_name, last_name, phone, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (first_name, last_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [first_name, last_name, phone, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET);



// Send welcome email after successful registration
      const welcomeSubject = 'Welcome to Yo! Nutri';
      const welcomeText = `Welcome to Yo! Nutri

You've activated your customer account. Next time you shop with us, log in for faster checkout. Visit store: https://yonutri.com

If you have any questions, reply to this email or contact us at listen@yonutri.com`;

      console.log('Attempting to send welcome email to:', email);
      sendEmail(email, welcomeSubject, welcomeText)
        .then(() => {
          console.log('Welcome email sent successfully to:', email);
        })
        .catch((emailError) => {
          console.error('Failed to send welcome email to:', email, 'error code:', emailError.code, 'message:', emailError.message, 'stack:', emailError.stack);
          // Don't fail registration if email fails
        });














      res.json({ message: 'User registered successfully', token });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      }
    });
  });
});

// Forgot password - request reset code
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  console.log('Forgot password request for email:', email);

  // First check users table
  const userQuery = 'SELECT id, email, phone FROM users WHERE email = ?';
  // Then check admins table if not found in users
  const adminQuery = 'SELECT id, email FROM admins WHERE email = ?';

  db.query(userQuery, [email], async (err, userResults) => {
    if (err) {
      console.error('Database error in forgot password (users):', err);
      return res.status(500).json({ message: 'Database error' });
    }

    console.log('User query results:', userResults.length, 'results found');

    if (userResults.length > 0) {
      // User found in users table
      const user = userResults[0];
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

      // Store code with expiration and isAdmin flag false
      resetCodes.set(user.email, { code, expires: Date.now() + 15 * 60 * 1000, isAdmin: false });

      let emailSent = false;
      let smsSent = false;
      const errors = [];

      console.log('Starting forgot password process for user email:', user.email, 'phone:', user.phone);

      try {
        console.log('Attempting to send password reset email to:', user.email);
        const emailPromise = sendEmail(user.email, 'Password Reset Code', `Your password reset code is: ${code}`)
          .then((result) => {
            console.log('Email sent successfully to user:', user.email, 'result:', result);
            emailSent = true;
          })
          .catch(err => {
            console.error('Error sending email to user:', user.email, 'error code:', err.code, 'message:', err.message, 'stack:', err.stack);
            errors.push('email');
          });

        const smsPromise = user.phone
          ? (console.log('Attempting to send password reset SMS to:', user.phone),
             sendSMS(user.phone, `Your password reset code is: ${code}`)
              .then((result) => {
                console.log('SMS sent successfully to user phone:', user.phone, 'result:', result);
                smsSent = true;
              })
              .catch(err => {
                console.error('Error sending SMS to user phone:', user.phone, 'error code:', err.code, 'message:', err.message, 'stack:', err.stack);
                errors.push('SMS');
              }))
          : Promise.resolve();

        await Promise.all([emailPromise, smsPromise]);
      } catch (error) {
        console.error('Unexpected error in forgot password (user):', error);
        return res.status(500).json({ message: 'An unexpected error occurred while sending the reset code.' });
      }

      console.log('Forgot password result for user - emailSent:', emailSent, 'smsSent:', smsSent, 'errors:', errors);

      if (emailSent || smsSent) {
        let message = 'Reset code sent';
        if (emailSent && !smsSent && user.phone) message = 'Reset code sent to email (SMS failed)';
        else if (!emailSent && smsSent) message = 'Reset code sent to phone (email failed)';
        else if (emailSent && smsSent) message = 'Reset code sent to email and phone';
        else if (emailSent) message = 'Reset code sent to email';

        console.log('Returning success message for user:', message);
        return res.json({ message, emailSent, smsSent });
      }

      console.log('Both email and SMS failed for user, errors:', errors);
      return res.status(500).json({ message: 'Failed to send reset code to both email and phone.', errors });
    } else {
      // Not found in users, check admins
      console.log('User not found in users table, checking admins table for email:', email);
      db.query(adminQuery, [email], async (err, adminResults) => {
        if (err) {
          console.error('Database error in forgot password (admins):', err);
          return res.status(500).json({ message: 'Database error' });
        }

        console.log('Admin query results:', adminResults.length, 'results found');

        if (adminResults.length > 0) {
          // Admin found
          const admin = adminResults[0];
          const code = Math.floor(100000 + Math.random() * 900000).toString();

          // Store code with expiration and isAdmin flag true
          resetCodes.set(admin.email, { code, expires: Date.now() + 15 * 60 * 1000, isAdmin: true });

          let emailSent = false;
          const errors = [];

          console.log('Starting forgot password process for admin email:', admin.email);

          try {
            console.log('Attempting to send password reset email to admin:', admin.email);
            const emailPromise = sendEmail(admin.email, 'Admin Password Reset Code', `Your admin password reset code is: ${code}`)
              .then((result) => {
                console.log('Email sent successfully to admin:', admin.email, 'result:', result);
                emailSent = true;
              })
              .catch(err => {
                console.error('Error sending email to admin:', admin.email, 'error code:', err.code, 'message:', err.message, 'stack:', err.stack);
                errors.push('email');
              });

            // Admins do not have phone numbers for SMS in current schema, so no SMS sent

            await Promise.all([emailPromise]);
          } catch (error) {
            console.error('Unexpected error in forgot password (admin):', error);
            return res.status(500).json({ message: 'An unexpected error occurred while sending the reset code.' });
          }

          console.log('Forgot password result for admin - emailSent:', emailSent, 'errors:', errors);

          if (emailSent) {
            let message = 'Reset code sent to email';
            console.log('Returning success message for admin:', message);
            return res.json({ message, emailSent });
          }

          console.log('Email failed for admin, errors:', errors);
          return res.status(500).json({ message: 'Failed to send reset code to email.', errors });
        } else {
          console.log('Email not found in users or admins:', email);
          return res.status(404).json({ message: 'User not found' });
        }
      });
    }
  });
});



// Verify reset code and set new password
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  const stored = resetCodes.get(email);
  if (!stored || stored.code !== code || stored.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Determine which table to update based on isAdmin flag
    let query, tableName;
    if (stored.isAdmin) {
      query = 'UPDATE admins SET password_hash = ? WHERE email = ?';
      tableName = 'admins';
    } else {
      query = 'UPDATE users SET password_hash = ? WHERE email = ?';
      tableName = 'users';
    }

    db.query(query, [hashedPassword, email], (err) => {
      if (err) {
        console.error(`Database error updating ${tableName} password:`, err);
        return res.status(500).json({ message: 'Database error' });
      }

      // Remove used code
      resetCodes.delete(email);

      console.log(`Password reset successful for ${tableName} email:`, email);
      res.json({ message: 'Password reset successful' });
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});



// Admin login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM admins WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const admin = results[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, isAdmin: true }, JWT_SECRET);
    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  });
});

// Get user profile
app.get('/api/user/profile', verifyToken, (req, res) => {
  const query = 'SELECT id, first_name, last_name, phone, email, address, city, state, pincode FROM users WHERE id = ?';
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  });
});

// Update user profile/address
app.put('/api/user/profile', verifyToken, (req, res) => {
  const { first_name, last_name, phone, address, city, state, pincode } = req.body;

  const query = 'UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?';
  db.query(query, [first_name, last_name, phone, address, city, state, pincode, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Profile updated successfully' });
  });
});

// Get user orders
app.get('/api/user/orders', verifyToken, (req, res) => {
  const query = `
    SELECT o.*, oi.quantity, oi.price, pv.grams, p.name as product_name, f.name as flavor_name
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN product_variants pv ON oi.product_variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by order
    const orders = {};
    results.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          total_amount: row.total_amount,
          status: row.status,
          shipping_status: row.shipping_status,
          shipping_address: row.shipping_address,
          shipping_city: row.shipping_city,
          shipping_state: row.shipping_state,
          shipping_pincode: row.shipping_pincode,
          shipping_phone: row.shipping_phone,
          tracking_number: row.tracking_number,
          shiprocket_order_id: row.shiprocket_order_id,
          created_at: row.created_at,
          items: []
        };
      }
      orders[row.id].items.push({
        product_name: row.product_name,
        flavor: row.flavor_name,
        grams: row.grams,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(Object.values(orders));
  });
});

// Create order
app.post('/api/orders', verifyToken, (req, res) => {
  const {
    items,
    total_amount,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    shipping_phone,
    payment_method
  } = req.body;

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Insert order
    const orderQuery = 'INSERT INTO orders (user_id, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(orderQuery, [req.user.id, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, shipping_phone, payment_method || 'Prepaid'], (err, orderResult) => {
      if (err) {
        console.error('Error inserting order:', err);
        return db.rollback(() => res.status(500).json({ error: err.message }));
      }

      const orderId = orderResult.insertId;

      // Insert order items
      const itemPromises = items.map(item => {
        return new Promise((resolve, reject) => {
          const itemQuery = 'INSERT INTO order_items (order_id, product_variant_id, quantity, price) VALUES (?, ?, ?, ?)';
          db.query(itemQuery, [orderId, item.variant_id, item.quantity, item.price], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      Promise.all(itemPromises)
        .then(async () => {
          // Create ShipRocket order after successful database transaction
          try {
            // Get user details for shipping
            const userQuery = 'SELECT first_name, last_name, phone, email, address, city, state, pincode FROM users WHERE id = ?';
            const userResult = await new Promise((resolve, reject) => {
              db.query(userQuery, [req.user.id], (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
              });
            });

            // Get order items with product details
            const itemsQuery = `
              SELECT oi.quantity, oi.price, pv.grams, p.name as product_name, p.hsn_code, f.name as flavor_name
              FROM order_items oi
              JOIN product_variants pv ON oi.product_variant_id = pv.id
              JOIN products p ON pv.product_id = p.id
              LEFT JOIN flavors f ON pv.flavor_id = f.id
              WHERE oi.order_id = ?
            `;
            const orderItems = await new Promise((resolve, reject) => {
              db.query(itemsQuery, [orderId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
              });
            });

            // Prepare ShipRocket order data
            const shipRocketOrderData = {
              order_id: `YoNutri-${orderId}`,
              order_date: new Date().toISOString().split('T')[0],
              pickup_location: PICKUP_DETAILS.location,
              channel_id: '',
              comment: 'Order from Yo! Nutri',
              billing_customer_name: `${userResult.first_name} ${userResult.last_name}`,
              billing_last_name: userResult.last_name,
              billing_address: shipping_address || userResult.address,
              billing_address_2: '',
              billing_city: shipping_city || userResult.city,
              billing_pincode: shipping_pincode || userResult.pincode,
              billing_state: shipping_state || userResult.state,
              billing_country: 'India',
              billing_email: userResult.email,
              billing_phone: shipping_phone || userResult.phone,
              shipping_is_billing: false, // Set to false as we provide both
              shipping_customer_name: `${userResult.first_name} ${userResult.last_name}`,
              shipping_last_name: userResult.last_name,
              shipping_address: shipping_address || userResult.address,
              shipping_address_2: '',
              shipping_city: shipping_city || userResult.city,
              shipping_pincode: shipping_pincode || userResult.pincode,
              shipping_country: 'India',
              shipping_state: shipping_state || userResult.state,
              shipping_email: userResult.email,
              shipping_phone: shipping_phone || userResult.phone,
              order_items: orderItems.map(item => ({
                name: `${item.product_name} ${item.flavor_name || ''} ${item.grams}g`,
                sku: `YoNutri-${item.product_name.replace(/\s+/g, '-').toLowerCase()}-${item.grams}`,
                units: item.quantity,
                selling_price: item.price,
                discount: 0,
                tax: 0, // You may want to calculate tax based on product type
                hsn: item.hsn_code || '' // Use the HSN code from the database. Fallback to an empty string if null.
              })),
              payment_method: payment_method || 'Prepaid',
              shipping_charges: 0,
              giftwrap_charges: 0,
              transaction_charges: 0,
              total_discount: 0,
              sub_total: total_amount,
              length: 10,
              breadth: 10,
              height: 10,
              weight: orderItems.reduce((total, item) => total + (item.quantity * (item.grams / 1000)), 0) // Convert grams to kg
            };

            // Create ShipRocket order
            const shipRocketResult = await createShipRocketOrder(shipRocketOrderData);

            // Update order with ShipRocket tracking info
            const updateOrderQuery = 'UPDATE orders SET shiprocket_order_id = ?, shipping_status = ? WHERE id = ?';
            await new Promise((resolve, reject) => {
              db.query(updateOrderQuery, [shipRocketResult.order_id, 'Processing', orderId], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });

            db.commit((err) => {
              if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
              }
              res.json({
                message: 'Order created successfully',
                order_id: orderId,
                shiprocket_order_id: shipRocketResult.order_id
              });
            });

          } catch (shipRocketError) {
            console.error('ShipRocket integration error:', shipRocketError);
            // Still commit the order even if ShipRocket fails
            db.commit((err) => {
              if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
              }
              res.json({
                message: 'Order created successfully (ShipRocket integration failed)',
                order_id: orderId,
                warning: 'Shipping integration failed, please contact support'
              });
            });
          }
        })
        .catch((err) => {
          db.rollback(() => res.status(500).json({ error: err.message }));
        });
    });
  });
});

// Get testimonials
app.get('/api/testimonials', (req, res) => {
  const query = `
    SELECT *
    FROM testimonials
    ORDER BY created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get hero images
app.get('/api/hero-images', (req, res) => {
  const query = 'SELECT id, image_url, alt_text, image_type FROM hero_images ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get coupons
app.get('/api/coupons', (req, res) => {
  const query = 'SELECT * FROM coupons WHERE expiry_date >= CURDATE() OR expiry_date IS NULL';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get offer products for special offers section
app.get('/api/offers', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE p.is_offer = 1
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    res.json(Object.values(products));
  });
});

// Get flavors
app.get('/api/flavors', (req, res) => {
  const query = 'SELECT * FROM flavors ORDER BY name ASC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});



// Admin routes
app.get('/api/admin/products', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = `
    SELECT p.*, c.name as category_name, pv.id as variant_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    ORDER BY p.id, pv.grams
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group by product
    const products = {};
    results.forEach(row => {
      if (!products[row.id]) {
        products[row.id] = {
          id: row.id,
          name: row.name,
          category: row.category_name,
          description: row.description,
          base_price: row.base_price,
          image_url: row.image_url,
          variants: []
        };
      }
      if (row.variant_id) {
        products[row.id].variants.push({
          id: row.variant_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor: row.flavor_name
        });
      }
    });

    res.json(Object.values(products));
  });
});

// Admin routes for product variants
app.get('/api/admin/product-variants', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = `
    SELECT pv.*, p.name as product_name, f.name as flavor_name
    FROM product_variants pv
    LEFT JOIN products p ON pv.product_id = p.id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/admin/product-variants', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { product_id, flavor_id, grams, price, stock } = req.body;
  const query = 'INSERT INTO product_variants (product_id, flavor_id, grams, price, stock) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [product_id, flavor_id, grams, price, stock], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product variant added successfully', id: result.insertId });
  });
});

app.put('/api/admin/product-variants/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { product_id, flavor_id, grams, price, stock } = req.body;
  const query = 'UPDATE product_variants SET product_id = ?, flavor_id = ?, grams = ?, price = ?, stock = ? WHERE id = ?';
  db.query(query, [product_id, flavor_id, grams, price, stock, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product variant updated successfully' });
  });
});

app.delete('/api/admin/product-variants/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'DELETE FROM product_variants WHERE id = ?';
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product variant deleted successfully' });
  });
});

// Admin routes for users
app.get('/api/admin/users', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT id, first_name, last_name, phone, email FROM users ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Admin routes for orders
app.get('/api/admin/orders', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = `
    SELECT o.id, o.total_amount, o.status, o.shipping_status, o.shipping_address, o.shipping_city,
           o.shipping_state, o.shipping_pincode, o.shipping_phone, o.tracking_number,
           o.shiprocket_order_id, o.created_at, u.first_name, u.last_name, u.email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Admin routes for categories
app.get('/api/admin/categories', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name ASC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Deduplicate categories by name (case-insensitive)
    const uniqueCategoriesMap = new Map();
    results.forEach(cat => {
      const nameKey = cat.name.toLowerCase();
      if (!uniqueCategoriesMap.has(nameKey)) {
        uniqueCategoriesMap.set(nameKey, cat);
      }
    });
    const uniqueCategories = Array.from(uniqueCategoriesMap.values());

    res.json(uniqueCategories);
  });
});

app.post('/api/admin/categories', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  const query = 'INSERT INTO categories (name, parent_id) VALUES (?, NULL)';
  db.query(query, [name.trim()], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Category created successfully', id: result.insertId });
  });
});

// Admin routes for coupons
app.get('/api/admin/coupons', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT * FROM coupons';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/admin/coupons/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT * FROM coupons WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(results[0]);
  });
});

app.post('/api/admin/coupons', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { code, discount_type, discount_amount, expiry_date, usage_limit, minimum_amount } = req.body;
  const query = 'INSERT INTO coupons (code, discount_type, discount_amount, expiry_date, usage_limit, minimum_amount) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [code, discount_type, discount_amount, expiry_date, usage_limit, minimum_amount], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Coupon added successfully', id: result.insertId });
  });
});

app.put('/api/admin/coupons/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { code, discount_type, discount_amount, expiry_date, usage_limit, minimum_amount } = req.body;
  const query = 'UPDATE coupons SET code = ?, discount_type = ?, discount_amount = ?, expiry_date = ?, usage_limit = ?, minimum_amount = ? WHERE id = ?';
  db.query(query, [code, discount_type, discount_amount, expiry_date, usage_limit, minimum_amount, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Coupon updated successfully' });
  });
});

app.delete('/api/admin/coupons/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'DELETE FROM coupons WHERE id = ?';
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Coupon deleted successfully' });
  });
});

app.get('/api/admin/products/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = ` 
    SELECT p.*, pv.id as variant_id, pv.flavor_id, pv.grams, pv.price, pv.stock, f.name as flavor_name
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN flavors f ON pv.flavor_id = f.id
    WHERE p.id = ?
  `;

  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Product not found' });

    // Group variants
    const product = {
      id: results[0].id,
      name: results[0].name,
      description: results[0].description,
      category_id: results[0].category_id,
      base_price: results[0].base_price,
      image_url: results[0].image_url,
      // is_offer: results[0].is_offer,
      hsn_code: results[0].hsn_code,
      variants: []
    };

    results.forEach(row => {
      if (row.variant_id) {
        product.variants.push({
          id: row.variant_id,
          flavor_id: row.flavor_id,
          grams: row.grams,
          price: row.price,
          stock: row.stock,
          flavor_name: row.flavor_name
        });
      }
    });

    res.json(product);
  });
});

app.post('/api/admin/products', verifyToken, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  let { name, description, category_id, base_price, variants, newFlavors, hsn_code } = req.body;
  const image_url = req.file ? '/uploads/' + req.file.filename : null;

  // Convert base_price to null if empty or invalid for DB
  if (base_price === 'null' || base_price === '' || base_price === undefined) {
    base_price = null;
  } else {
    base_price = parseFloat(base_price);
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Insert product
    const productQuery = 'INSERT INTO products (name, description, category_id, base_price, image_url, hsn_code) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(productQuery, [name, description, category_id, base_price, image_url, hsn_code], (err, productResult) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ error: err.message }));
      }

      const productId = productResult.insertId;

      // Parse variants and new flavors JSON
      let variantsData = [];
      let newFlavorsData = [];
      try {
        variantsData = JSON.parse(variants || '[]');
        newFlavorsData = JSON.parse(newFlavors || '[]');
      } catch (e) {
        return db.rollback(() => res.status(400).json({ message: 'Invalid variants or new flavors data' }));
      }

      // For bar categories (4,5,6), variants are not required
    // For bar categories (4,5,6), variants and base_price are not required
    if (![4,5,6].includes(parseInt(category_id)) && variantsData.length === 0 && newFlavorsData.length === 0) {
      return db.rollback(() => res.status(400).json({ message: 'At least one variant is required' }));
    }

      // First, create new flavors if any
      const createNewFlavors = () => {
        if (newFlavorsData.length === 0) {
          return Promise.resolve([]);
        }

        const flavorPromises = newFlavorsData.map(flavor => {
          return new Promise((resolve, reject) => {
            const flavorQuery = 'INSERT INTO flavors (name) VALUES (?)';
            db.query(flavorQuery, [flavor.name], (err, result) => {
              if (err) reject(err);
              else resolve({ ...flavor, id: result.insertId });
            });
          });
        });

        return Promise.all(flavorPromises);
      };

      createNewFlavors()
        .then((createdFlavors) => {
          // Combine existing variants with new flavor variants
          const allVariants = [...variantsData];

          // Add variants for newly created flavors
          createdFlavors.forEach(flavor => {
            allVariants.push({
              flavor_id: flavor.id,
              grams: flavor.grams,
              price: flavor.price,
              stock: flavor.stock
            });
          });

          // Insert all variants
          const variantPromises = allVariants.map(variant => {
            return new Promise((resolve, reject) => {
              const variantQuery = 'INSERT INTO product_variants (product_id, flavor_id, grams, price, stock) VALUES (?, ?, ?, ?, ?)';
              db.query(variantQuery, [productId, variant.flavor_id, variant.grams, variant.price, variant.stock], (err, result) => {
                if (err) reject(err);
                else resolve(result);
              });
            });
          });

          return Promise.all(variantPromises);
        })
        .then(() => {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => res.status(500).json({ error: err.message }));
            }
            res.json({ message: 'Product and variants added successfully', id: productId });
          });
        })
        .catch((err) => {
          db.rollback(() => res.status(500).json({ error: err.message }));
        });
    });
  });
});

app.put('/api/admin/products/:id', verifyToken, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { name, description, category_id, base_price, variants, newFlavors, hsn_code} = req.body;
  const image_url = req.file ? '/uploads/' + req.file.filename : null;

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // Update product
    let productQuery, productParams;
    if (image_url) {
      productQuery = 'UPDATE products SET name = ?, description = ?, category_id = ?, base_price = ?, image_url = ?, hsn_code = ? WHERE id = ?';
      productParams = [name, description, category_id, base_price, image_url, hsn_code, req.params.id];
    } else {
      productQuery = 'UPDATE products SET name = ?, description = ?, category_id = ?, base_price = ?, hsn_code = ? WHERE id = ?';
      productParams = [name, description, category_id, base_price, hsn_code,  req.params.id];
    }

    db.query(productQuery, productParams, (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ error: err.message }));
      }

      // Delete existing variants
      const deleteVariantsQuery = 'DELETE FROM product_variants WHERE product_id = ?';
      db.query(deleteVariantsQuery, [req.params.id], (err) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ error: err.message }));
        }

        // Parse variants and new flavors JSON
        let variantsData = [];
        let newFlavorsData = [];
        try {
          variantsData = JSON.parse(variants || '[]');
          newFlavorsData = JSON.parse(newFlavors || '[]');
        } catch (e) {
          return db.rollback(() => res.status(400).json({ message: 'Invalid variants or new flavors data' }));
        }

        if (![4,5,6].includes(category_id) && variantsData.length === 0 && newFlavorsData.length === 0) {
          return db.rollback(() => res.status(400).json({ message: 'At least one variant is required' }));
        }

        // First, create new flavors if any
        const createNewFlavors = () => {
          if (newFlavorsData.length === 0) {
            return Promise.resolve([]);
          }

          const flavorPromises = newFlavorsData.map(flavor => {
            return new Promise((resolve, reject) => {
              const flavorQuery = 'INSERT INTO flavors (name) VALUES (?)';
              db.query(flavorQuery, [flavor.name], (err, result) => {
                if (err) reject(err);
                else resolve({ ...flavor, id: result.insertId });
              });
            });
          });

          return Promise.all(flavorPromises);
        };

        createNewFlavors()
          .then((createdFlavors) => {
            // Combine existing variants with new flavor variants
            const allVariants = [...variantsData];

            // Add variants for newly created flavors
            createdFlavors.forEach(flavor => {
              allVariants.push({
                flavor_id: flavor.id,
                grams: flavor.grams,
                price: flavor.price,
                stock: flavor.stock
              });
            });

            // Insert all variants
            const variantPromises = allVariants.map(variant => {
              return new Promise((resolve, reject) => {
                const variantQuery = 'INSERT INTO product_variants (product_id, flavor_id, grams, price, stock) VALUES (?, ?, ?, ?, ?)';
                db.query(variantQuery, [req.params.id, variant.flavor_id, variant.grams, variant.price, variant.stock], (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                });
              });
            });

            return Promise.all(variantPromises);
          })
          .then(() => {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
              }
              res.json({ message: 'Product and variants updated successfully' });
            });
          })
          .catch((err) => {
            db.rollback(() => res.status(500).json({ error: err.message }));
          });
      });
    });
  });
});

app.delete('/api/admin/products/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'DELETE FROM products WHERE id = ?';

  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product deleted successfully' });
  });
});

// Testimonials management
app.get('/api/admin/testimonials', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT * FROM testimonials';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/admin/testimonials', verifyToken, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const image_url = req.file ? '/uploads/' + req.file.filename : null;
  if (!image_url) return res.status(400).json({ message: 'Image is required' });

  const query = 'INSERT INTO testimonials (image_url) VALUES (?)';
  db.query(query, [image_url], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Testimonial added successfully', id: result.insertId });
  });
});

app.put('/api/admin/testimonials/:id', verifyToken, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const image_url = req.file ? '/uploads/' + req.file.filename : null;
  if (!image_url) return res.status(400).json({ message: 'Image is required' });

  const query = 'UPDATE testimonials SET image_url = ? WHERE id = ?';
  db.query(query, [image_url, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Testimonial updated successfully' });
  });
});

app.delete('/api/admin/testimonials/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'DELETE FROM testimonials WHERE id = ?';
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Testimonial deleted successfully' });
  });
});

// Hero images management
app.get('/api/admin/hero-images', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'SELECT * FROM hero_images';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/admin/hero-images', verifyToken, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const { alt_text, image_type } = req.body;
  const image_url = req.file ? '/uploads/' + req.file.filename : null;
  if (!image_url) return res.status(400).json({ message: 'Image is required' });

  const query = 'INSERT INTO hero_images (image_url, alt_text, image_type) VALUES (?, ?, ?)';
  db.query(query, [image_url, alt_text, image_type], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Hero image added successfully', id: result.insertId });
  });
});

app.delete('/api/admin/hero-images/:id', verifyToken, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

  const query = 'DELETE FROM hero_images WHERE id = ?';
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Hero image deleted successfully' });
  });
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  const testQuery = 'SELECT COUNT(*) as user_count FROM users';
  db.query(testQuery, (err, results) => {
    if (err) {
      console.error('Database test error:', err);
      return res.status(500).json({ message: 'Database connection failed', error: err.message });
    }
    console.log('Database test successful, user count:', results[0].user_count);
    res.json({ message: 'Database connection successful', user_count: results[0].user_count });
  });
});

// Test admin database connection
app.get('/api/test-admin-db', (req, res) => {
  const testQuery = 'SELECT COUNT(*) as admin_count FROM admins';
  db.query(testQuery, (err, results) => {
    if (err) {
      console.error('Admin database test error:', err);
      return res.status(500).json({ message: 'Admin database connection failed', error: err.message });
    }
    console.log('Admin database test successful, admin count:', results[0].admin_count);
    res.json({ message: 'Admin database connection successful', admin_count: results[0].admin_count });
  });
});

// Payment success endpoint - sends confirmation email
app.post('/api/payment-success', (req, res) => {
  const { payment_id, order_id, amount, email, customer_name } = req.body;

  if (!email || !payment_id || !amount) {
    return res.status(400).json({ message: 'Missing required payment details' });
  }

  const subject = 'Payment Successful - Yo Nutri Order Confirmation';
  const text = `
Dear ${customer_name || 'Valued Customer'},

Thank you for your purchase from Yo Nutri!

Payment Details:
- Payment ID: ${payment_id}
- Order ID: ${order_id || 'N/A'}
- Amount Paid: ₹${amount}

Your order has been confirmed and is being processed. You will receive a shipping update once your order is dispatched.

For any queries, please contact our support team.

Best regards,
Yo Nutri Team
www.yonutri.com
  `;

  sendEmail(email, subject, text)
    .then(() => {
      console.log('Payment success email sent to:', email);
      res.json({ message: 'Payment confirmation email sent successfully' });
    })
    .catch((error) => {
      console.error('Failed to send payment success email:', error);
      res.status(500).json({ message: 'Payment successful but email failed to send' });
    });
});

// Test specific admin email lookup
app.get('/api/test-admin-email/:email', (req, res) => {
  const email = req.params.email;
  const testQuery = 'SELECT id, email FROM admins WHERE email = ?';
  db.query(testQuery, [email], (err, results) => {
    if (err) {
      console.error('Admin email lookup error:', err);
      return res.status(500).json({ message: 'Admin email lookup failed', error: err.message });
    }
    console.log('Admin email lookup results for', email, ':', results.length, 'results');
    if (results.length > 0) {
      console.log('Found admin:', results[0]);
    }
    res.json({
      message: 'Admin email lookup completed',
      email: email,
      found: results.length > 0,
      results: results
    });
  });
});

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// Serve the frontend index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});
