const { initializeDatabase } = require('./postgres');

initializeDatabase()
  .then(db => db.close())
  .then(() => {
    console.log('PostgreSQL database initialized successfully.');
  })
  .catch(err => {
    console.error('Error initializing database:', err);
    process.exit(1);
  });
