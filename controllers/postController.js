require('dotenv').config();
const Post = require('../models/post');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const url = require('url');

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
				return res.status(404).json('Error creating post');
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
				.populate({
					path: 'comments',
					populate: {
						path: 'author',
					},
				})
				.exec();
			if (!post) {
				return res.status(404).json('Post not found');
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
			return res.status(404).json('Post not found');
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
			return res.status(404).json('Post not found');
		}
		if (thePost.likes.includes(req.user._id)) {
			const post = await Post.findByIdAndUpdate(
				req.body.postId,
				{ $pull: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.populate({
					path: 'comments',
					populate: {
						path: 'author',
					},
				})
				.exec();
			return res.status(200).json(post);
		} else {
			const post = await Post.findByIdAndUpdate(
				req.body.postId,
				{ $addToSet: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.populate({
					path: 'comments',
					populate: {
						path: 'author',
					},
				})
				.exec();
			return res.status(200).json(post);
		}
	} catch (error) {
		next(error);
	}
};

exports.search_posts = async (req, res, next) => {
	try {
		const query = url.parse(req.url, true).query.q;
		const search_post_results = await Post.find({
			text: { $regex: query, $options: 'i' },
		})
			.populate('author')
			.exec();
		return res.status(200).json(search_post_results);
	} catch (error) {
		next(error);
	}
};
