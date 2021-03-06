var User = require('../models/user');
var jwt = require('jwt-simple');
var passport = require('passport');
var config = require('../config/database'); // get db config file
var passportConfig = require('../config/passport'); // get auth utils file
/**
 * Expose /signup /authenticate and /account endpoints for user management
 */
module.exports = function (app) {
	// route to register a new user
	app.post('/api/signup', function (req, res) {
		//Verify recieved payload
		if (!req.body.name || !req.body.password) {
			res.status(422).json({ msg: 'Please pass name and password.' });
		} else {
			//If valid, instantiate the new user
			var newUser = new User({
				name: req.body.name,
				password: req.body.password,
				email: req.body.email,
				firstname: req.body.firstname,
				lastname: req.body.lastname
			});
			// save the user
			newUser.save(function (err) {
				if (err) {

					return res.status(409).json({ msg: 'Username already exists.' });
				}
				res.status(201).json({ msg: 'Successful created new user.' });
			});
		}
	});

	// route to authenticate as an user of the application
	app.post('/api/authenticate', function (req, res) {
		User.findOne({
			name: req.body.name
		}, function (err, user) {
			if (err) { console.log(err); return; }

			if (!user) {
				res.status(401).send({ msg: 'Authentication failed. User not found.' });
			} else {
				// check if password matches
				user.comparePassword(req.body.password, function (err, isMatch) {
					if (isMatch && !err) {
						// if user is found and password is right create a token
						var token = jwt.encode(user, config.secret);
						// return the information including token as JSON
						res.status(200).json({ token: 'JWT ' + token });
					} else {
						res.status(401).send({ msg: 'Authentication failed. Wrong password.' });
					}
				});
			}
		});
	});

	// route to fetch an user's account informations
	app.get('/api/account', passport.authenticate('jwt', { session: false }), function (req, res) {
		var token = passportConfig.getToken(req.headers);
		if (token) {
			var decoded = jwt.decode(token, config.secret);
			//Look for the user
			User.findOne({
				name: decoded.name
			}, function (err, user) {
				if (err) { console.log(err); return; }

				if (!user) {
					return res.status(403).send({ msg: 'Authentication failed. User not found.' });
				} else {
					//If found, return it's account information
					res.status(200).json({
						username: user.name,
						firstname: user.firstname,
						email: user.email,
						lastname: user.lastname,
						createdAt: user.createdAt
					});
				}
			});
		} else {
			return res.status(403).send({ msg: 'No token provided.' });
		}
	});
}
