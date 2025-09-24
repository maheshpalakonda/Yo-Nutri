const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'Yono'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

async function updateAdminPassword(email, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE admins SET password_hash = ? WHERE email = ?';
    db.query(query, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('Error updating admin password:', err.message);
        process.exit(1);
      }
      if (result.affectedRows === 0) {
        console.log(`Admin user with email ${email} not found`);
        process.exit(1);
      }
      console.log(`Admin password updated successfully for ${email}`);
      process.exit(0);
    });
  } catch (error) {
    console.error('Error hashing password:', error.message);
    process.exit(1);
  }
}

// Usage: node update_admin.js <email> <new_password>
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node update_admin.js <email> <new_password>');
  process.exit(1);
}

updateAdminPassword(email, password);
