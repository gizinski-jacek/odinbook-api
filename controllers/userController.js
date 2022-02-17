require('dotenv').config();
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcryptjs = require('bcryptjs');

exports.sign_up_user = [
	body('first_name', 'First name is invalid')
		.trim()
		.isLength({ min: 4, max: 32 })
		.escape(),
	body('last_name', 'Last name is invalid')
		.trim()
		.isLength({ min: 4, max: 32 })
		.escape(),
	body('email', 'Email is invalid')
		.trim()
		.isLength({ min: 8, max: 64 })
		.escape(),
	body('password', 'Password is invalid')
		.trim()
		.isLength({ min: 8, max: 64 })
		.escape(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			const newUser = new User({
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				email: req.body.email,
			});
			if (!errors.isEmpty()) {
				res.status(404).json(errors.array());
			}
			const hashedPassword = await bcryptjs.hash(req.body.password, 10);
			newUser.password = hashedPassword;
			const user = await newUser.save();
			if (!user) {
				return res
					.status(404)
					.json('Error creating user, try again in a few minutes');
			}
			res.status(200).json({ success: true });
		} catch (error) {
			next(error);
		}
	},
];

exports.log_in_user = async (req, res, next) => {
	passport.authenticate(
		'login',
		{ session: false },
		async (error, user, msg) => {
			if (error) {
				return next(error);
			}
			try {
				if (!user) {
					return res.status(401).json(msg);
				}
				const token = jwt.sign(
					{ _id: user._id, username: user.username },
					process.env.STRATEGY_SECRET,
					{ expiresIn: '15m' }
				);
				res.cookie('token', token, {
					httpOnly: true,
					secure: false,
					sameSite: 'strict',
				});
				res.status(200).json({ _id: user._id, username: user.username });
			} catch (error) {
				next(error);
			}
		}
	);
};

exports.log_out_user = (req, res, next) => {
	res.clearCookie('token', { path: '/' });
	res.status(200).json({ success: true });
};

exports.verify_user_token = async (req, res, next) => {
	try {
		if (req.cookies.token) {
			const decodedToken = jwt.verify(
				req.cookies.token,
				process.env.STRATEGY_SECRET
			);
			const user = await User.findById(decodedToken._id, 'username').exec();
			return res.status(200).json(user);
		}
		res.status(200).json(null);
	} catch (error) {
		res.clearCookie('token', { path: '/' });
		res.status(403).json('Failed to verify user token. Please log in');
	}
};
