require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcryptjs = require('bcryptjs');
const User = require('../models/user');

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
					return done(null, false, { msg: 'Incorrect email' });
				}
				const match = await bcryptjs.compare(password, user.password);
				if (!match) {
					return done(null, false, { msg: 'Incorrect password' });
				}
				return done(null, user, { msg: 'Logged in successfully' });
			} catch (error) {
				done(error);
			}
		}
	)
);

passport.use(
	'facebook',
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID,
			clientSecret: process.env.FACEBOOK_SECRET,
			callbackURL: 'http://localhost:4000/api/log-in/facebook/callback',
			profileFields: ['id', 'email', 'displayName'],
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
						const newUser = new User({
							facebookId: profile.id,
							first_name: profile.displayName.split(' ')[0],
							last_name: profile.displayName.split(' ')[1],
							email: profile.emails[0].value,
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
					);
					return done(null, linkFBToAccount);
				}
				return done(null, userExists);
			} catch (error) {
				console.log(error);
				done(error);
			}
		}
	)
);

const extractCookie = (req) => {
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
			jwtFromRequest: extractCookie,
			secretOrKey: process.env.STRATEGY_SECRET,
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
