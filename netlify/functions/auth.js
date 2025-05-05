const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
  const { httpMethod, path } = event;
  const body = event.body ? JSON.parse(event.body) : {};

  // Signup
  if (httpMethod === 'POST' && path.endsWith('/signup')) {
    const { username, password } = body;
    if (await User.findOne({ username })) return { statusCode: 400, body: JSON.stringify({ error: 'User exists' }) };
    const hash = await bcrypt.hash(password, 10);
    await User.create({ username, password: hash });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  // Login
  if (httpMethod === 'POST' && path.endsWith('/login')) {
    const { username, password } = body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid credentials' }) };
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  }

  // Me
  if (httpMethod === 'GET' && path.endsWith('/me')) {
    const auth = event.headers.authorization;
    if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'No token' }) };
    try {
      const token = auth.split(' ')[1];
      const userData = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(userData.id);
      return { statusCode: 200, body: JSON.stringify({ username: user.username }) };
    } catch {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }
  }

  return { statusCode: 404, body: 'Not found' };
}; 