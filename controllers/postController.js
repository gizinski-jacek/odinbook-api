require('dotenv').config();
const Post = require('../models/post');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_post = [
	body('title', 'Title is invalid')
		.trim()
		.isLength({ min: 4, max: 32 })
		.escape(),
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 4, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			const newPost = new Post({
				author: req.user._id,
				title: req.body.title,
				text: req.body.text,
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const post = await newPost.save();
			if (!post) {
				return res
					.status(404)
					.json('Error creating post, try again in a few minutes');
			}
			return res.status(200).json('New post created successfully');
		} catch (error) {
			next(error);
		}
	},
];

exports.get_single_post = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		const post = await Post.findById(req.params.postid)
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		if (!post) {
			return res.status(404).json('Post not found');
		}
		return res.status(200).json(post);
	} catch (error) {
		next(error);
	}
};

exports.get_user_posts = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
			return res.status(404).json('Invalid user Id');
		}
		const user_posts = await Post.find({ author: req.user._id })
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		return res.status(200).json(user_posts);
	} catch (error) {
		next(error);
	}
};

exports.get_user_friends_posts = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
			return res.status(404).json('Invalid user Id');
		}
		const user = User.findById(req.user._id).exec();
		const user_friends_posts = await Post.find({
			_id: { $in: user.friendList },
		})
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		return res.status(200).json(user_friends_posts);
	} catch (error) {
		next(error);
	}
};

exports.update_post = [
	body('title', 'Title is invalid')
		.trim()
		.isLength({ min: 4, max: 32 })
		.escape(),
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 4, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			const thePost = await Post.findById(req.params.postid).exec();
			const errors = validationResult(req);
			const updatedPost = new Post({
				// _id: req.params.postid,
				_id: thePost._id,
				// author: req.user._id,
				author: thePost.author,
				title: req.body.title,
				text: req.body.text,
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const post = await Post.findByIdAndUpdate(
				req.params.postid,
				updatedPost,
				{ upsert: true, timestamps: true }
			)
				.populate('comments')
				.exec();
			if (!post) {
				return res
					.status(404)
					.json('Post not found. Creating new post instead');
			}
			return res.status(200).json('Post updated successfully');
		} catch (error) {
			next(error);
		}
	},
];

exports.delete_post = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		const post = await Post.findByIdAndDelete(req.params.postid).exec();
		if (!post) {
			return res.status(404).json('Post not found, nothing to delete');
		}
		return res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

exports.change_like_status = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		const thePost = await Post.findOne({
			_id: req.params.postid,
			likes: { $in: req.user._id },
		}).exec();
		if (thePost) {
			const post = await Post.findByIdAndUpdate(
				req.params.postid,
				{ $pull: { likes: req.user._id } },
				{ timestamps: false }
			).exec();
			if (!post) {
				return res.status(404).json('Post not found, nothing to unlike');
			}
			return res.status(200).json({ success: true });
		} else {
			const post = await Post.findByIdAndUpdate(
				req.params.postid,
				{ $addToSet: { likes: req.user._id } },
				{ timestamps: false }
			)
				.populate('comments')
				.exec();
			if (!post) {
				return res.status(404).json('Post not found, nothing to like');
			}
			return res.status(200).json({ success: true });
		}
	} catch (error) {
		next(error);
	}
};
