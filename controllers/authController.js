const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { CLIENT_BASE_URL } = require('../config/constants');

const signJwtToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signJwtToken(user._id);
  // Remove password from the output
  user.password = undefined;
  user.__v = undefined;

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res) => {
  const { name, email, password, passwordConfirm, role = 'user' } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    role,
  });

  const url = `${CLIENT_BASE_URL}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // get token and check if it's there
  let token = '';
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please login to get access', 401));
  }

  // validate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist', 401));
  }

  // check if user changed password afetr jwt was created
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please login again', 401));
  }

  // GRANT ACCESS TO THE PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  // Generate the random token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // Send it back as an email

  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Reset link sent your email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email, please try again!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If token has not expired, and there is user, set password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Update chagedPasswordAt for the user
  await user.save();

  // Log the user in
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const userId = req.user.id;

  const user = await User.findById(userId).select('+password');
  const { passwordCurrent, newPassword, newPasswordConfirm } = req.body;

  // if posted password is correct
  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // Check if new password is equal to old password
  if (
    newPassword === newPasswordConfirm &&
    (await user.correctPassword(newPassword, user.password))
  ) {
    return next(new AppError("New password can't be the same as old password.", 403));
  }

  // if so then, update the password
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  // log in the user
  createSendToken(user, 200, req, res);
});
