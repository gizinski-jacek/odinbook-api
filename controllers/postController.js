require('dotenv').config();
const Post = require('../models/post');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const url = require('url');
const fs = require('fs');

exports.get_timeline_posts = async (req, res, next) => {
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
	body('text', 'Text format is incorrect')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				if (req.file) {
					fs.unlink(`public/photos/posts/${req.file.filename}`, (error) => {
						if (error) throw error;
					});
				}
				return res.status(404).json(errors.array());
			}
			let picture_name;
			if (req.file) {
				picture_name = req.file.filename;
			}
			const newPost = new Post({
				author: req.user._id,
				text: req.body.text,
				picture: picture_name,
			});
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
	body('text', 'Text format is incorrect')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.body._id)) {
				return res.status(404).json('Invalid post Id');
			}
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				if (req.file) {
					fs.unlink(`public/photos/posts/${req.file.filename}`, (error) => {
						if (error) throw error;
					});
				}
				return res.status(404).json(errors.array());
			}
			let picture_name;
			if (req.file) {
				picture_name = req.file.filename;
			}
			const thePost = await Post.findById(req.body._id).exec();
			const updatedPost = new Post({
				_id: thePost._id,
				author: thePost.author,
				text: req.body.text,
				picture: picture_name,
				comments: thePost.comments,
				likes: thePost.likes,
			});

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
			if (thePost.picture) {
				fs.unlink(`public/photos/posts/${thePost.picture}`, (error) => {
					if (error) throw error;
				});
			}
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
		if (post.picture) {
			fs.unlink(`public/photos/posts/${post.picture}`, (error) => {
				if (error) throw error;
			});
		}
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
		const postExists = await Post.findById(req.body.postId).exec();
		if (!postExists) {
			return res.status(404).json('Post not found');
		}
		if (postExists.likes.includes(req.user._id)) {
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
		const search_post_list = await Post.find({
			text: { $regex: query, $options: 'i' },
		})
			.populate('author')
			.exec();
		return res.status(200).json(search_post_list);
	} catch (error) {
		next(error);
	}
};
