const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb+srv://arshad1314ali_db_user:lXz67sTeQ3utfZpF@cluster0.xfzfrcg.mongodb.net/?appName=Cluster0';
    
    // Ensure database name is in connection string
    // If URI doesn't have database name, add it
    if (!mongoURI.includes('/?') && !mongoURI.match(/\/[^?]+(\?|$)/)) {
      const dbName = process.env.DB_NAME || 'medical_service';
      // Add database name before query parameters
      if (mongoURI.includes('?')) {
        mongoURI = mongoURI.replace('?', `/${dbName}?`);
      } else {
        mongoURI = mongoURI + `/${dbName}`;
      }
    }
    
    console.log('🔌 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      retryWrites: true,
      retryReads: true,
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
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo') || error.message.includes('ESERVFAIL')) {
      console.error('\n🌐 DNS/Network Error. Please check:');
      console.error('   1. Internet connection is working');
      console.error('   2. MongoDB Atlas cluster is running (not paused)');
      console.error('   3. DNS resolution is working (try: nslookup cluster0.tycrgj0.mongodb.net)');
      console.error('   4. Firewall/VPN is not blocking MongoDB connections');
      console.error('   5. Try using direct connection string instead of SRV');
    }
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('\n🚫 IP Address not allowed. Please check:');
      console.error('   1. MongoDB Atlas → Network Access → IP Access List');
      console.error('   2. Add your current IP address');
      console.error('   3. Or add 0.0.0.0/0 (for testing only - not recommended for production)');
    }
    
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      console.error('\n⏱️  Connection Timeout. Please check:');
      console.error('   1. MongoDB Atlas cluster is running');
      console.error('   2. Network connectivity');
      console.error('   3. Firewall settings');
    }
    
    console.error('\n📝 Connection String (masked):');
    const uri = process.env.MONGODB_URI || '';
    const maskedURI = uri.replace(/:[^:@]+@/, ':****@');
    console.error(`   ${maskedURI}`);
    
    console.error('\n💡 Troubleshooting Tips:');
    console.error('   1. Check MongoDB Atlas dashboard - is cluster running?');
    console.error('   2. Verify connection string in .env file');
    console.error('   3. Check Network Access in MongoDB Atlas');
    console.error('   4. Try connecting from MongoDB Compass with same credentials');
    console.error('   5. If using VPN, try disconnecting and reconnecting\n');
    
    // Don't exit in development, let server continue (optional)
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
