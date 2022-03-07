require('dotenv').config();
const Post = require('../models/post');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_post = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			const newPost = new Post({
				author: req.user._id,
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
			const user = await User.findById(req.user._id).exec();
			const timeline_post_list = await Post.find({
				author: { $in: [req.user._id, ...user.friend_list] },
			})
				.sort({ createdAt: 'desc' })
				.populate('author')
				.populate('comments')
				.exec();
			return res.status(200).json(timeline_post_list);
		} catch (error) {
			next(error);
		}
	},
];

exports.get_user_post_list = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.userid)) {
			return res.status(404).json('Invalid post Id');
		}
		const post_list = await Post.find({ author: req.params.userid })
			.sort({ createdAt: 'desc' })
			.populate('author')
			.populate('comments')
			.exec();
		return res.status(200).json(post_list);
	} catch (error) {
		next(error);
	}
};

exports.get_single_post = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		const post = await Post.findById(req.params.postid)
			.populate('author')
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

exports.get_user_timeline_posts = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).exec();
		const timeline_post_list = await Post.find({
			author: { $in: [user._id, ...user.friend_list] },
		})
			.sort({ createdAt: 'desc' })
			.populate('author')
			.populate({
				path: 'comments',
				populate: {
					path: 'author',
				},
			})
			.exec();
		return res.status(200).json(timeline_post_list);
	} catch (error) {
		next(error);
	}
};

exports.update_post = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.body._id)) {
				return res.status(404).json('Invalid post Id');
			}
			const thePost = await Post.findById(req.body._id).exec();
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
			const post = await Post.findByIdAndUpdate(thePost._id, updatedPost, {
				timestamps: true,
				new: true,
			})
				.populate('author')
				.populate('comments')
				.exec();
			if (!post) {
				return res.status(404).json('Post not found. Nothing to update');
			}
			return res.status(200).json(post);
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
		if (!mongoose.Types.ObjectId.isValid(req.body.postId)) {
			return res.status(404).json('Invalid post Id');
		}
		const thePost = await Post.findById(req.body.postId).exec();
		if (!thePost) {
			return res.status(404).json('Post not found, nothing to like or unlike');
		}
		if (thePost.likes.includes(req.user._id)) {
			const post = await Post.findByIdAndUpdate(
				req.body.postId,
				{ $pull: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.populate('comments')
				.exec();
			return res.status(200).json(post);
		} else {
			const post = await Post.findByIdAndUpdate(
				req.body.postId,
				{ $addToSet: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.populate('comments')
				.exec();
			return res.status(200).json(post);
		}
	} catch (error) {
		next(error);
	}
};
