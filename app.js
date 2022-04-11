require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('./mongo/mongoConfig');
require('./passport/passport');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

const app = express();
app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', process.env.CLIENT_URI);
	res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
	res.header(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, Content-Length, X-Requested-With, X-Api-Key'
	);
	res.header('Access-Control-Allow-Credentials', 'true');
	next();
});
app.use(cors({ origin: process.env.CLIENT_URI, credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	// res.render('error');
});

module.exports = app;
