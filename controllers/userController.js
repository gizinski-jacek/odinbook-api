require('dotenv').config();
const User = require('../models/user');
const Post = require('../models/post');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');

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
			const user_list = await User.find({ email: req.body.email }).exec();
			if (user_list.length > 0) {
				return res.status(409).json('Email is already taken');
			}
			const errors = validationResult(req);
			const newUser = new User({
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				email: req.body.email,
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const hashedPassword = await bcryptjs.hash(req.body.password, 10);
			newUser.password = hashedPassword;
			const user = await newUser.save();
			if (!user) {
				return res
					.status(404)
					.json('Error creating user, try again in a few minutes');
			}
			return res.status(200).json('User created successfully');
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
				const payload = {
					_id: user._id,
					email: user.email,
					first_name: user.first_name,
					last_name: user.last_name,
				};
				const token = jwt.sign(payload, process.env.STRATEGY_SECRET, {
					expiresIn: '150m',
				});
				res.cookie('token', token, {
					httpOnly: true,
					secure: false,
					sameSite: 'strict',
				});
				return res.status(200).json({ payload });
			} catch (error) {
				next(error);
			}
		}
	)(req, res, next);
};

exports.log_out_user = (req, res, next) => {
	res.clearCookie('token', { path: '/' });
	return res.status(200).json({ success: true });
};

exports.verify_user_token = async (req, res, next) => {
	try {
		if (req.cookies.token) {
			const decodedToken = jwt.verify(
				req.cookies.token,
				process.env.STRATEGY_SECRET
			);
			const user = await User.findById(decodedToken._id).exec();
			return res.status(200).json(user);
		}
		return res.status(200).json(null);
	} catch (error) {
		res.clearCookie('token', { path: '/' });
		return res
			.status(403)
			.json('Failed to verify user token. Please log in again');
	}
};

exports.get_single_user = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = await User.findById(req.params.userid).exec();
		return res.status(200).json(user);
	} catch (error) {
		next(error);
	}
};

exports.get_people_list = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();
		const user_list = await User.find({
			_id: {
				$nin: [user._id, ...user.friend_list, ...user.blocked_user_list],
			},
		}).exec();
		return res.status(200).json(user_list);
	} catch (error) {
		next(error);
	}
};

exports.send_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = await User.findById(req.user._id).exec();
		if (user.blocked_user_list.includes(req.body.userId)) {
			return res.status(200).json({
				msg: 'This user has blocked you. Unable to send friend request',
			});
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.user._id,
				{
					$addToSet: { outgoing_friend_requests: req.body.userId },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.body.userId,
				{
					$addToSet: { incoming_friend_requests: req.user._id },
				},
				{ new: true }
			).exec(),
		]);
		// const user_list = await User.find(
		// 	{
		// 		_id: {
		// 			$nin: [
		// 				users_data[0]._id,
		// 				...users_data[0].friend_list,
		// 				...users_data[0].blocked_user_list,
		// 			],
		// 		},
		// 	},
		// ).exec();
		return res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

exports.block_user = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = await User.findByIdAndUpdate(req.user._id, {
			$addToSet: { blocked_user_list: req.body.userId },
		});
		return res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

exports.get_request_list = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();
		const friend_requests = await User.find({
			_id: { $in: user.incoming_friend_requests },
		}).exec();
		return res.status(200).json(friend_requests);
	} catch (error) {
		next(error);
	}
};

exports.get_friend_list = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();
		const friend_list = await User.find({
			_id: { $in: user.friend_list },
		}).exec();
		return res.status(200).json(friend_list);
	} catch (error) {
		next(error);
	}
};

exports.get_contacts = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();
		const contacts_data = await Promise.all([
			User.find({ _id: { $in: user.incoming_friend_requests } }).exec(),
			User.find({ _id: { $in: user.friend_list } }).exec(),
		]);
		return res.status(200).json(contacts_data);
	} catch (error) {
		next(error);
	}
};

exports.accept_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.requestId)) {
			return res.status(404).json('Invalid request Id');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.user._id,
				{
					$addToSet: { friend_list: req.body.requestId },
					$pull: { incoming_friend_requests: req.body.requestId },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.body.requestId,
				{
					$addToSet: { friend_list: req.user._id },
					$pull: { outgoing_friend_requests: req.user._id },
				},
				{ new: true }
			).exec(),
		]);
		const contacts_data = await Promise.all([
			User.find({ _id: { $in: users_data[0].friend_requests } }).exec(),
			User.find({ _id: { $in: users_data[0].friend_list } }).exec(),
		]);
		return res.status(200).json(contacts_data);
	} catch (error) {
		next(error);
	}
};

exports.decline_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.requestId)) {
			return res.status(404).json('Invalid request Id');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.user._id,
				{
					$pull: { incoming_friend_requests: req.body.requestId },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.body.requestId,
				{
					$pull: { outgoing_friend_requests: req.user._id },
				},
				{ new: true }
			).exec(),
		]);
		const friend_requests = await User.find({
			_id: { $in: users_data[0].friend_requests },
		}).exec();
		return res.status(200).json(friend_requests);
	} catch (error) {
		next(error);
	}
};
