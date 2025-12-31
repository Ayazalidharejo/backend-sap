const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb+srv://arshad1314ali_db_user:lXz67sTeQ3utfZpF@cluster0.xfzfrcg.mongodb.net/medical_service?retryWrites=true&w=majority';
    
    // Add database name if not present (check if URI ends with .net/ or .net/?)
    if (mongoURI.includes('.net/?') || mongoURI.match(/\.net\/\?/)) {
      // Has /? but no database name
      const dbName = process.env.DB_NAME || 'medical_service';
      mongoURI = mongoURI.replace('.net/?', `.net/${dbName}?`);
    } else if (mongoURI.match(/\.net\/$/)) {
      // Ends with .net/ (no database name, no query params)
      const dbName = process.env.DB_NAME || 'medical_service';
      mongoURI = mongoURI + dbName;
    } else if (!mongoURI.match(/\.net\/[^?]+/)) {
      // No database name at all
      const dbName = process.env.DB_NAME || 'medical_service';
      mongoURI = mongoURI.replace('.net', `.net/${dbName}`);
    }
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('Connection string format check - make sure database name is included');
  }
};

module.exports = connectDB;
