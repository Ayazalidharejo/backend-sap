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
      // Keep buffering enabled (default) to allow queries before connection is ready
      // Mongoose will queue commands until connection is established
      // No need to set bufferMaxEntries or bufferCommands - use defaults (unlimited buffering)
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
    };
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB Connected');
    
    // Verify connection is ready
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB Connection Ready - Ready to accept queries');
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Don't throw - let the app continue, Mongoose will buffer commands
  }
};

module.exports = connectDB;
