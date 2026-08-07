import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Exclude password from query results by default
    },
    plan: {
      type: String,
      default: 'free',
      enum: ['free', 'pro'],
    },
    analysisCount: {
      type: Number,
      default: 0,
    },
    lastAnalysisDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);
export default User;
