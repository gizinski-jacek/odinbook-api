const mongoose = require('mongoose');
require('mongoose-type-email');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
	{
		first_name: { type: String, minlength: 4, maxlength: 32, required: true },
		last_name: { type: String, minlength: 4, maxlength: 32, required: true },
		email: {
			type: Schema.Types.Email,
			minlength: 8,
			maxlength: 64,
			required: true,
		},
		password: {
			type: String,
			minlength: 8,
			maxlength: 64,
			required: true,
			select: false,
		},
		friend_list: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		blocked_user_list: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		incoming_friend_requests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		outgoing_friend_requests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
	},
	{ toJSON: { virtuals: true } }
);

// Virtual for user's full name
UserSchema.virtual('full_name').get(function () {
	return `${this.first_name} ${this.last_name}`;
});

module.exports = mongoose.model('User', UserSchema);
