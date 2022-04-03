require('dotenv').config();
const Comment = require('../models/comment');
const Post = require('../models/post');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_comment = [
	body('text', 'Text format is incorrect')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const newComment = new Comment({
				author: req.user._id,
				post_ref: req.params.postid,
				text: req.body.text,
			});
			const comment = await newComment.save();
			if (!comment) {
				return res.status(404).json('Error creating comment');
			}
			const post = await Post.findByIdAndUpdate(
				req.params.postid,
				{ $addToSet: { comments: comment._id } },
				{ new: true }
			)
				.populate('author')
				.populate({ path: 'comments', populate: { path: 'author' } })
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

exports.update_comment = [
	body('text', 'Text format is incorrect')
		.trim()
		.isLength({ min: 1, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.body.post_ref)) {
				return res.status(404).json('Invalid post Id');
			}
			if (!mongoose.Types.ObjectId.isValid(req.body._id)) {
				return res.status(404).json('Invalid comment Id');
			}
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const theComment = await Comment.findById(req.body._id).exec();
			if (!theComment) {
				return res.status(404).json('Comment not found');
			}
			const updatedComment = new Comment({
				_id: theComment._id,
				author: theComment.author,
				post_ref: theComment.post_ref,
				text: req.body.text,
				likes: theComment.likes,
			});
			const comment = await Comment.findByIdAndUpdate(
				theComment._id,
				updatedComment,
				{ timestamps: true, new: true }
			)
				.populate('author')
				.exec();
			if (!comment) {
				return res.status(404).json('Comment not found');
			}
			return res.status(200).json(comment);
		} catch (error) {
			next(error);
		}
	},
];

exports.delete_comment = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
			return res.status(404).json('Invalid post Id');
		}
		if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
			return res.status(404).json('Invalid comment Id');
		}
		await Comment.findByIdAndDelete(req.params.commentid).exec();
		const comment_list = await Comment.find({
			post_ref: req.params.postid,
		})
			.sort({ createdAt: 'asc' })
			.populate('author')
			.exec();
		return res.status(200).json(comment_list);
	} catch (error) {
		next(error);
	}
};

exports.change_like_status = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.commentPostRef)) {
			return res.status(404).json('Invalid post Id');
		}
		if (!mongoose.Types.ObjectId.isValid(req.body.commentId)) {
			return res.status(404).json('Invalid comment Id');
		}
		const theComment = await Comment.findById(req.body.commentId).exec();
		if (!theComment) {
			return res.status(404).json('Comment not found');
		}
		if (theComment.likes.includes(req.user._id)) {
			const comment = await Comment.findByIdAndUpdate(
				req.body.commentId,
				{ $pull: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.exec();
			if (!comment) {
				return res.status(404).json('Comment not found');
			}
			return res.status(200).json(comment);
		} else {
			const comment = await Comment.findByIdAndUpdate(
				req.body.commentId,
				{ $addToSet: { likes: req.user._id } },
				{ timestamps: false, new: true }
			)
				.populate('author')
				.exec();
			if (!comment) {
				return res.status(404).json('Comment not found');
			}
			return res.status(200).json(comment);
		}
	} catch (error) {
		next(error);
	}
};
