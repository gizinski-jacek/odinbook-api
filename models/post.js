const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		text: { type: String, minlength: 1, maxlength: 512, required: true },
		picture_name: { type: String, maxlength: 128, default: '' },
		picture_url: { type: String, maxlength: 256, default: '' },
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Post', PostSchema);
