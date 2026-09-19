import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../middleware/auth.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  addresses: user.addresses,
  createdAt: user.createdAt,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, mobile } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = new User({ name, email, mobile: mobile || '', role: 'customer' });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({
    success: true,
    data: { user: publicUser(user), token: signToken(user) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ success: true, data: { user: publicUser(user), token: signToken(user) } });
});

/** Admin sign-in. Rejects customer credentials outright. */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (user.role !== 'admin') throw ApiError.forbidden('This account does not have administrator access');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ success: true, data: { user: publicUser(user), token: signToken(user) } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, mobile } = req.body;
  if (name !== undefined) req.user.name = name;
  if (mobile !== undefined) req.user.mobile = mobile;
  await req.user.save();
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});

// ---- addresses -------------------------------------------------------------

export const listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  const address = req.body;
  if (address.isDefault || req.user.addresses.length === 0) {
    req.user.addresses.forEach((a) => { a.isDefault = false; });
    address.isDefault = true;
  }
  req.user.addresses.push(address);
  await req.user.save();
  res.status(201).json({ success: true, data: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');

  Object.assign(address, req.body);
  if (req.body.isDefault) {
    req.user.addresses.forEach((a) => {
      if (!a._id.equals(address._id)) a.isDefault = false;
    });
    address.isDefault = true;
  }
  await req.user.save();
  res.json({ success: true, data: req.user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true;
  await req.user.save();
  res.json({ success: true, data: req.user.addresses });
});
