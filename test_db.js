const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});

async function test() {
  console.log("Connecting to:", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  for (const coll of ['leads', 'members', 'trainers', 'payments']) {
    const count = await db.collection(coll).countDocuments();
    const indexes = await db.collection(coll).indexes();
    console.log(`Collection: ${coll} - Count: ${count}`);
    console.log(`Indexes on ${coll}:`, indexes.map(i => Object.keys(i.key).join(',')));
  }
  process.exit(0);
}
test();
