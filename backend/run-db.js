const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'database.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split by semicolon, but handle multiple statements
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root'
});

db.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }
  console.log('Connected to MySQL');

  // Execute statements one by one
  let i = 0;
  const executeNext = () => {
    if (i >= statements.length) {
      console.log('All statements executed');
      db.end();
      return;
    }
    const statement = statements[i] + ';';
    console.log('Executing:', statement.substring(0, 50) + '...');
    db.query(statement, (err) => {
      if (err) {
        console.error('Error executing statement:', err);
        db.end();
        return;
      }
      i++;
      executeNext();
    });
  };
  executeNext();
});
