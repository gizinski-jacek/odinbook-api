require('dotenv').config();
const Comment = require('../models/comment');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.create_comment = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 8, max: 512 })
		.escape(),
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			const errors = validationResult(req);
			const newComment = new Comment({
				author: req.user._id,
				post_ref: req.params.postid,
				text: req.body.text,
				likes: [],
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const comment = await newComment.save();
			if (!comment) {
				return res
					.status(404)
					.json('Error creating comment, try again in a few minutes');
			}
			res.status(200).json('Comment created successfully');
		} catch (error) {
			next(error);
		}
	},
];

exports.update_comment = [
	body('text', 'Text is invalid')
		.trim()
		.isLength({ min: 8, max: 512 })
		.escape(),
	,
	async (req, res, next) => {
		try {
			if (!mongoose.Types.ObjectId.isValid(req.params.postid)) {
				return res.status(404).json('Invalid post Id');
			}
			if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
				return res.status(404).json('Invalid comment Id');
			}
			const theComment = await Comment.findById(req.params.commentid).exec();
			const errors = validationResult(req);
			const updatedComment = new Comment({
				// _id: req.params.commentid,
				_id: theComment._id,
				// author: req.user._id,
				author: theComment.author,
				// post_ref: req.params.postid,
				post_ref: theComment.post_ref,
				text: req.body.text,
				likes: [],
			});
			if (!errors.isEmpty()) {
				return res.status(404).json(errors.array());
			}
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				updatedComment,
				{ upsert: true, timestamps: true }
			);
			if (!comment) {
				return res
					.status(404)
					.json('Comment not found. Creating new comment instead');
			}
			res.status(200).json('Comment updated successfully');
		} catch (error) {
			next(error);
		}
	},
];

exports.delete_comment = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
			return res.status(404).json('Invalid comment Id');
		}
		const comment = await Comment.findByIdAndDelete(
			req.params.commentid
		).exec();
		if (!comment) {
			return res.status(404).json('Comment not found, nothing to delete');
		}
		res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
};

exports.change_like_status = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.commentid)) {
			return res.status(404).json('Invalid comment Id');
		}
		const theComment = await Comment.findOne({
			_id: req.params.commentid,
			likes: { $in: req.user._id },
		}).exec();
		if (theComment) {
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				{ $pull: { likes: req.user._id } },
				{ new: true, timestamps: false }
			).exec();
			if (!comment) {
				return res.status(404).json('Comment not found, nothing to unlike');
			}
			res.status(200).json({ success: true });
		} else {
			const comment = await Comment.findByIdAndUpdate(
				req.params.commentid,
				{ $addToSet: { likes: req.user._id } },
				{ new: true, timestamps: false }
			).exec();
			if (!comment) {
				return res.status(404).json('Comment not found, nothing to like');
			}
			res.status(200).json({ success: true });
		}
	} catch (error) {
		next(error);
	}
};
