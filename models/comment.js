const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CommentSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		post_ref: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
		text: { type: String, minlength: 1, maxlength: 512, required: true },
		likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Comment', CommentSchema);
