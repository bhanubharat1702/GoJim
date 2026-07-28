const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    await mongoose.connect(uri, {
      maxPoolSize: 500,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
