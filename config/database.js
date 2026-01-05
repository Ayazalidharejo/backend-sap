const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://arshad1314ali_db_user:lXz67sTeQ3utfZpF@cluster0.xfzfrcg.mongodb.net/medical_service?retryWrites=true&w=majority';
    
    // Configure MongoDB connection options to remove/increase timeouts
    // Set very large timeout values (1 hour = 3600000ms) to effectively disable timeouts
    const ONE_HOUR_MS = 3600000; // 1 hour in milliseconds
    const options = {
      serverSelectionTimeoutMS: ONE_HOUR_MS, // Wait up to 1 hour for server selection
      socketTimeoutMS: ONE_HOUR_MS, // Wait up to 1 hour for socket operations
      connectTimeoutMS: ONE_HOUR_MS, // Wait up to 1 hour for initial connection
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
    };
    
    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Connected');
    
    // Set global mongoose options to disable buffering timeout
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferMaxEntries', 0);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

module.exports = connectDB;
