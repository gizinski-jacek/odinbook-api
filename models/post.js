const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		title: { type: String, minlength: 4, maxlength: 32, required: true },
		text: { type: String, minlength: 8, maxlength: 512, required: true },
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
		likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

// Virtual for post's URL
PostSchema.virtual('url').get(function () {
	return '/posts/' + this._id;
});

module.exports = mongoose.model('Post', PostSchema);
