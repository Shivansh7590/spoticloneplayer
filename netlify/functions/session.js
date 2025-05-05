const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shivanshtiwari6354:83rTZlaN7dtwCXAs@spoticloneplayer.x7dssk4.mongodb.net/?retryWrites=true&w=majority&appName=spoticloneplayer';

let conn = null;
async function connectToDatabase() {
  if (conn == null) {
    conn = await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }
  return conn;
}

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  session: Object
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

exports.handler = async function(event, context) {
  await connectToDatabase();
  const { httpMethod } = event;
  const auth = event.headers.authorization;
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'No token' }) };
  let userData;
  try {
    const token = auth.split(' ')[1];
    userData = jwt.verify(token, JWT_SECRET);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  // Save session
  if (httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    await User.findByIdAndUpdate(userData.id, { session: body });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  // Get session
  if (httpMethod === 'GET') {
    const user = await User.findById(userData.id);
    return { statusCode: 200, body: JSON.stringify(user.session || {}) };
  }

  return { statusCode: 404, body: 'Not found' };
}; 