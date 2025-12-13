const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-service';
    
    console.log('🔌 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    
    // More specific error messages
    if (error.message.includes('authentication failed') || error.message.includes('bad auth')) {
      console.error('\n🔐 Authentication Failed. Please check:');
      console.error('   1. Username and password in connection string');
      console.error('   2. Database user exists in MongoDB Atlas');
      console.error('   3. Database user has proper permissions');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n🌐 Network Error. Please check:');
      console.error('   1. Internet connection');
      console.error('   2. MongoDB Atlas cluster is running');
    }
    
    if (error.message.includes('IP')) {
      console.error('\n🚫 IP Address not allowed. Please check:');
      console.error('   1. MongoDB Atlas → Network Access');
      console.error('   2. Add your IP address or 0.0.0.0/0 (for testing)');
    }
    
    console.error('\n📝 Connection String (masked):');
    const uri = process.env.MONGODB_URI || '';
    const maskedURI = uri.replace(/:[^:@]+@/, ':****@');
    console.error(`   ${maskedURI}\n`);
    
    // Don't exit in development, let server continue (optional)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
