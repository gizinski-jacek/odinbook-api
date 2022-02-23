require('dotenv').config();
const Post = require('../models/post');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_post = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 4, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
				return res.status(404).json('Invalid user Id');
			}
			const errors = validationResult(req);
			const newPost = new Post({
				author: req.user._id,
				text: req.body.text,
				comments: [],
				likes: [],
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
			const timeline_post_list = await Post.find({
				author: { $in: [req.user._id, ...req.user.friend_list] },
			})
				.sort({ createdAt: 'desc' })
				.populate('author', 'first_name last_name')
				.populate('comments')
				.exec();
			return res.status(200).json(timeline_post_list);
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
			.sort({ createdAt: 'desc' })
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
		const user_friends_posts = await Post.find({
			author: { $in: req.user.friend_list },
		})
			.sort({ createdAt: 'desc' })
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		return res.status(200).json(user_friends_posts);
	} catch (error) {
		next(error);
	}
};

exports.get_user_timeline_posts = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
			return res.status(404).json('Invalid user Id');
		}
		const timeline_post_list = await Post.find({
			author: { $in: [req.user._id, ...req.user.friend_list] },
		})
			.sort({ createdAt: 'desc' })
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		return res.status(200).json(timeline_post_list);
	} catch (error) {
		next(error);
	}
};

exports.update_post = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 4, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
				return res.status(404).json('Invalid user Id');
			}
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			const thePost = await Post.findById(req.params.postid).exec();
			const errors = validationResult(req);
			const updatedPost = new Post({
				_id: thePost._id,
				author: thePost.author,
				text: req.body.text,
				comments: thePost.comments,
				likes: thePost.likes,
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const post = await Post.findByIdAndUpdate(
				req.params.postid,
				updatedPost,
				{ timestamps: true }
			)
				.populate('comments')
				.exec();
			if (!post) {
				return res.status(404).json('Post not found. Nothing to update');
			}
			const timeline_post_list = await Post.find({
				author: { $in: [req.user._id, ...req.user.friend_list] },
			})
				.sort({ createdAt: 'desc' })
				.populate('author', 'first_name last_name')
				.populate('comments')
				.exec();
			return res.status(200).json(timeline_post_list);
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
		const timeline_post_list = await Post.find({
			author: { $in: [req.user._id, ...req.user.friend_list] },
		})
			.sort({ createdAt: 'desc' })
			.populate('author', 'first_name last_name')
			.populate('comments')
			.exec();
		return res.status(200).json(timeline_post_list);
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
			const timeline_post_list = await Post.find({
				author: { $in: [req.user._id, ...req.user.friend_list] },
			})
				.sort({ createdAt: 'desc' })
				.populate('author', 'first_name last_name')
				.populate('comments')
				.exec();
			return res.status(200).json(timeline_post_list);
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
			const timeline_post_list = await Post.find({
				author: { $in: [req.user._id, ...req.user.friend_list] },
			})
				.sort({ createdAt: 'desc' })
				.populate('author', 'first_name last_name')
				.populate('comments')
				.exec();
			return res.status(200).json(timeline_post_list);
		}
	} catch (error) {
		next(error);
	}
};
