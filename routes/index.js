const express = require('express');
const router = express.Router();
const parkController = require('../controllers/parkController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// Parks Get Routes
// Get Parks or an individual park
router.get('/', catchErrors(parkController.getParks));
router.get('/parks', catchErrors(parkController.getParks));
router.get('/parks/page/:page', catchErrors(parkController.getParks));
router.get('/park/:slug', catchErrors(parkController.getParkBySlug));

// Add a Park
router.get('/add', authController.isLoggedIn, parkController.addPark);

// Edit a Park
router.get('/parks/:id/edit', catchErrors(parkController.editPark));

// Tags for Parks
router.get('/tags', catchErrors(parkController.getParksByTag));
router.get('/tags/:tag', catchErrors(parkController.getParksByTag));

// Parks Map feature
router.get('/map', parkController.mapPage);

// Parks hearts feature
router.get('/hearts', authController.isLoggedIn, catchErrors(parkController.getHearts));

// Top Parks feature
router.get('/top', catchErrors(parkController.getTopParks));

// Parks Post Routes
// Add park 
router.post('/add',
  parkController.upload,
  catchErrors(parkController.resize),
  catchErrors(parkController.createPark)
);
// Add image and update Park
router.post('/add/:id',
  parkController.upload,
  catchErrors(parkController.resize),
  catchErrors(parkController.updatePark)
);



// User/Auth Get Routes
// Login / Logout
router.get('/login', userController.loginForm);
router.get('/logout', authController.logout);


// Register
router.get('/register', userController.registerForm);

// Account Tools
router.get('/account', authController.isLoggedIn, userController.account);
router.get('/account/reset/:token', catchErrors(authController.reset));


// User/Auth Post Routes

// 1. Validate the registration data
// 2. register the user
// 3. we need to log them in
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

// Login
router.post('/login', authController.login);

// Account Managment
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

// Review Post Routes

router.post('/reviews/:id',
  authController.isLoggedIn,
  catchErrors(reviewController.addReview)
);

// API

router.get('/api/search', catchErrors(parkController.searchParks));
router.get('/api/parks/near', catchErrors(parkController.mapParks));
router.post('/api/parks/:id/heart', catchErrors(parkController.heartPark));



module.exports = router;
