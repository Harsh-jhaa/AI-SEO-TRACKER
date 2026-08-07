import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// generating token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }

    // Check if user already exists with the provided email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(
      password,
      await bcrypt.genSalt(10),
    );

    // create a user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // generate a token
    const token = generateToken(user._id);

    return res
      .status(201)
      .json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }

    // find user by email

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid credentials' });
    }

    // check password

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid credentials' });
    }

    // generate token
    const token = generateToken(user._id);

    return res
      .status(200)
      .json({ success: true, message: 'User logged in successfully', token });
  } catch (error) {
    // console.error(error);
    // return res.status(500).json({ success: false, message: 'Server error' });
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again',
    });
  }
};

// get current user
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('get user error', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
