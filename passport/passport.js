require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcryptjs = require('bcryptjs');
const User = require('../models/user');
const fs = require('fs');
const axios = require('axios');

passport.use(
	'login',
	new LocalStrategy(
		{ usernameField: 'email', passwordField: 'password' },
		async (email, password, done) => {
			try {
				const user = await User.findOne({ email: email })
					.select('+password')
					.exec();
				if (!user) {
					return done(null, false, {
						msg: 'Account with entered email not found',
					});
				}
				const match = await bcryptjs.compare(password, user.password);
				if (!match) {
					return done(null, false, { msg: 'Entered password is incorrect' });
				}
				return done(null, user, { success: true });
			} catch (error) {
				done(error);
			}
		}
	)
);

const downloadFBProfilePicture = async (url, file_name) => {
	try {
		const response = await axios({ url, responseType: 'stream' });
		await response.data.pipe(
			fs.createWriteStream('public/photos/users/' + file_name)
		);
		return file_name;
	} catch (error) {
		next(error);
	}
};

passport.use(
	'facebook',
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID,
			clientSecret: process.env.FACEBOOK_SECRET,
			callbackURL: process.env.API_URI + '/api/log-in/facebook/callback',
			profileFields: ['id', 'email', 'displayName', 'picture.type(large)'],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const userExists = await User.findOne({ facebookId: profile.id })
					.select('+email')
					.exec();
				if (!userExists) {
					const emailUsed = await User.findOne({
						email: profile.emails[0].value,
					}).exec();
					if (!emailUsed) {
						const picture_name =
							Date.now() + '__' + 'fb_pic_' + profile.id + '.jpg';
						await downloadFBProfilePicture(
							profile.photos[0].value,
							picture_name
						);
						const newUser = new User({
							facebookId: profile.id,
							first_name: profile.displayName.split(' ')[0],
							last_name: profile.displayName.split(' ')[1],
							email: profile.emails[0].value,
							profile_picture_name: picture_name,
							profile_picture_url:
								process.env.API_URI + '/photos/users/' + picture_name,
						});
						const randomString = Math.random().toString(36).substring(2, 10);
						const hashedPassword = await bcryptjs.hash(randomString, 10);
						newUser.password = hashedPassword;
						const user = await newUser.save();
						return done(null, user);
					}
					const linkFBToAccount = await User.findByIdAndUpdate(
						emailUsed._id,
						{ facebookId: profile.id },
						{ new: true }
					).exec();
					return done(null, linkFBToAccount);
				}
				return done(null, userExists);
			} catch (error) {
				done(error);
			}
		}
	)
);

const extractToken = (req) => {
	let token = null;
	if (req && req.cookies && req.cookies.token) {
		token = req.cookies.token;
	}
	return token;
};

passport.use(
	'jwt',
	new JWTStrategy(
		{
			jwtFromRequest: extractToken,
			secretOrKey: process.env.JWT_STRATEGY_SECRET,
		},
		(jwtPayload, done) => {
			try {
				if (jwtPayload) {
					done(null, jwtPayload);
				} else {
					done(null, false);
				}
			} catch (error) {
				done(error, false);
			}
		}
	)
);
