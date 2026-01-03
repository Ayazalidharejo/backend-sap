const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://arshad1314ali_db_user:lXz67sTeQ3utfZpF@cluster0.xfzfrcg.mongodb.net/medical_service?retryWrites=true&w=majority';
    
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

module.exports = connectDB;
