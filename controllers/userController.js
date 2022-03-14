require('dotenv').config();
const User = require('../models/user');
const Post = require('../models/post');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
const url = require('url');

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
		.isEmail()
		.custom(async (value) => {
			const user_list = await User.find({ email: value }).exec();
			if (user_list.length > 0) {
				throw new Error('Email is already taken');
			}
			return true;
		})
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
				return res.status(404).json(errors.array());
			}
			const hashedPassword = await bcryptjs.hash(req.body.password, 10);
			newUser.password = hashedPassword;
			const user = await newUser.save();
			if (!user) {
				return res.status(404).json('Error creating user');
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
				const data = { ...user._doc };
				delete data.password;
				return res.status(200).json(data);
			} catch (error) {
				next(error);
			}
		}
	)(req, res, next);
};

exports.log_in_facebook_user_callback = async (req, res, next) => {
	passport.authenticate(
		'facebook',
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
					facebookId: user.facebookId,
					_id: user._id,
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
				const data = { ...user._doc };
				delete data.password;
				return res.redirect(process.env.CLIENT_URL);
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
		return res.status(401).json('Failed to verify user token');
	}
};

exports.password_change = [
	body('password', 'Password is invalid')
		.trim()
		.isLength({ min: 8, max: 64 })
		.escape(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const user = await User.findById(req.user._id).select('+password').exec();
			const match = await bcryptjs.compare(req.body.password, user.password);
			if (match) {
				return res
					.status(409)
					.json('New password must be different from old password');
			}
			const hashedPassword = await bcryptjs.hash(req.body.password, 10);
			await User.findByIdAndUpdate(user._id, { password: hashedPassword });
			return res.status(200).json('Password changed successfully');
		} catch (error) {
			next(error);
		}
	},
];

exports.get_contacts_list = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id)
			.populate('incoming_friend_requests')
			.populate('friend_list')
			.exec();
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
				$nin: [user._id, ...user.friend_list],
			},
		}).exec();
		return res.status(200).json(user_list);
	} catch (error) {
		next(error);
	}
};

exports.change_block_status = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = await User.findById(req.user._id).exec();
		if (user.blocked_user_list.includes(req.body.userId)) {
			const users_data = await Promise.all([
				User.findByIdAndUpdate(
					req.body.userId,
					{
						$pull: { blocked_by_other_list: req.user._id },
					},
					{ new: true }
				).exec(),
				User.findByIdAndUpdate(
					req.user._id,
					{
						$pull: { blocked_user_list: req.body.userId },
					},
					{ new: true }
				).exec(),
			]);
			return res.status(200).json(users_data);
		} else {
			const users_data = await Promise.all([
				User.findByIdAndUpdate(
					req.body.userId,
					{
						$addToSet: { blocked_by_other_list: req.user._id },
						$pull: {
							friend_list: req.user._id,
							incoming_friend_requests: req.user._id,
							outgoing_friend_requests: req.user._id,
						},
					},
					{ new: true }
				).exec(),
				User.findByIdAndUpdate(
					req.user._id,
					{
						$addToSet: { blocked_user_list: req.body.userId },
						$pull: {
							friend_list: req.body.userId,
							incoming_friend_requests: req.body.userId,
							outgoing_friend_requests: req.body.userId,
						},
					},
					{ new: true }
				).exec(),
			]);
			return res.status(200).json(users_data);
		}
	} catch (error) {
		next(error);
	}
};

exports.send_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = await User.findById(req.body.userId).exec();
		if (user.blocked_user_list.includes(req.user._id)) {
			return res
				.status(200)
				.json('This user has blocked you. Unable to send friend request');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.body.userId,
				{
					$addToSet: { incoming_friend_requests: req.user._id },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.user._id,
				{
					$addToSet: { outgoing_friend_requests: req.body.userId },
				},
				{ new: true }
			).exec(),
		]);
		return res.status(200).json(users_data);
	} catch (error) {
		next(error);
	}
};

exports.accept_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid request Id');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.body.userId,
				{
					$addToSet: { friend_list: req.user._id },
					$pull: { outgoing_friend_requests: req.user._id },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.user._id,
				{
					$addToSet: { friend_list: req.body.userId },
					$pull: { incoming_friend_requests: req.body.userId },
				},
				{ new: true }
			)
				.populate('friend_list')
				.populate('incoming_friend_requests')
				.exec(),
		]);
		return res.status(200).json(users_data);
	} catch (error) {
		next(error);
	}
};

exports.cancel_friend_request = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.body.userId,
				{
					$pull: {
						incoming_friend_requests: req.user._id,
						outgoing_friend_requests: req.user._id,
					},
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.user._id,
				{
					$pull: {
						incoming_friend_requests: req.body.userId,
						outgoing_friend_requests: req.body.userId,
					},
				},
				{ new: true }
			)
				.populate('friend_list')
				.populate('incoming_friend_requests')
				.exec(),
		]);
		return res.status(200).json(users_data);
	} catch (error) {
		next(error);
	}
};

exports.remove_friend = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.userId)) {
			return res.status(404).json('Invalid user Id');
		}
		const users_data = await Promise.all([
			User.findByIdAndUpdate(
				req.body.userId,
				{
					$pull: { friend_list: req.user._id },
				},
				{ new: true }
			).exec(),
			User.findByIdAndUpdate(
				req.user._id,
				{
					$pull: { friend_list: req.body.userId },
				},
				{ new: true }
			)
				.populate('incoming_friend_requests')
				.populate('friend_list')
				.exec(),
		]);
		return res.status(200).json(users_data);
	} catch (error) {
		next(error);
	}
};

exports.get_single_user_friend_list = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
			return res.status(404).json('Invalid user Id');
		}
		const friend_list = await User.find({
			friend_list: req.params.userid,
		}).exec();
		return res.status(200).json(friend_list);
	} catch (error) {
		next(error);
	}
};

exports.get_single_user_post_list = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
			return res.status(404).json('Invalid post Id');
		}
		const post_list = await Post.find({ author: req.params.userid })
			.sort({ createdAt: 'desc' })
			.populate('author')
			.populate({
				path: 'comments',
				populate: {
					path: 'author',
				},
			})
			.exec();
		return res.status(200).json(post_list);
	} catch (error) {
		next(error);
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

exports.update_user_data = async (req, res, next) => {
	try {
		// if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
		// 	return res.status(404).json('Invalid user Id');
		// }
		// const user = await User.findById(req.params.userid).exec();
		// return res.status(200).json(user);
	} catch (error) {
		next(error);
	}
};

exports.search_people = async (req, res, next) => {
	try {
		const query = url.parse(req.url, true).query.q;
		const search_person_results = await User.find({
			_id: { $ne: req.user._id },
			$or: [
				{ first_name: { $regex: query, $options: 'i' } },
				{ last_name: { $regex: query, $options: 'i' } },
			],
		}).exec();
		return res.status(200).json(search_person_results);
	} catch (error) {
		next(error);
	}
};

exports.search_user_friend_list = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
			return res.status(404).json('Invalid user Id');
		}
		const query = url.parse(req.url, true).query.q;
		const search_friend_results = await User.find({
			friend_list: { $in: req.params.userid },
			$or: [
				{ first_name: { $regex: query, $options: 'i' } },
				{ last_name: { $regex: query, $options: 'i' } },
			],
		}).exec();
		return res.status(200).json(search_friend_results);
	} catch (error) {
		next(error);
	}
};
