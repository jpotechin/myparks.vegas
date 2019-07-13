const mongoose = require('mongoose');
const Park = mongoose.model('Park');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addPark = (req, res) => {
  res.render('editPark', { title: 'Add Park' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip to the next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our filesystem, keep going!
  next();
};

exports.createPark = async (req, res) => {
  req.body.author = req.user._id;
  const park = await (new Park(req.body)).save();
  req.flash('success', `Successfully Created ${park.name}. Care to leave a review?`);
  res.redirect(`/park/${park.slug}`);
};

exports.getParks = async (req, res) => {
  // 1. Query the database for a list of all parks
  const parks = await Park.find().populate('reviews');
  res.render('parks', { title: 'Parks', parks });
};

exports.getParks = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;

  // 1. Query the database for a list of all parks
  const parksPromise = Park
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ name: '1' });

  const countPromise = Park.count();
  //Waits for both parksPromise and countPromiss to finish
  const [parks, count] = await Promise.all([parksPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!parks.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/parks/page/${pages}`);
    return;
  }

  res.render('parks', { title: 'Parks', parks, page, pages, count });
};

const confirmOwner = (park, user) => {
  if (!park.author.equals(user._id)) {
    throw Error('You must have created the park in order to edit it!');
  }
};

exports.editPark = async (req, res) => {
  // 1. Find the park given the ID
  const park = await Park.findOne({ _id: req.params.id });
  // 2. confirm they are the owner of the park
  confirmOwner(park, req.user);
  // 3. Render out the edit form so the user can update their park
  res.render('editPark', { title: `Edit ${park.name}`, park });
};

exports.updatePark = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';
  // find and update the park
  const park = await Park.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new park instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${park.name}</strong>. <a href="/parks/${park.slug}">View Park →</a>`);
  res.redirect(`/parks/${park._id}/edit`);
  // Redriect them to the park and tell them it worked
};

exports.getParkBySlug = async (req, res, next) => {
  const park = await Park.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!park) return next();
  res.render('park', { park, title: park.name });
};

exports.getParksByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true, $ne: [] };

  const tagsPromise = Park.getTagsList();
  const parksPromise = Park.find({ tags: tagQuery });
  const [tags, parks] = await Promise.all([tagsPromise, parksPromise]);


  res.render('tag', { tags, title: 'Tags', tag, parks });
};


exports.searchParks = async (req, res) => {
  const parks = await Park
  // first find parks that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  // the sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5);
  res.json(parks);
};

exports.mapParks = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const parks = await Park.find(q).select('slug name description location photo').limit(10);
  res.json(parks);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartPark = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());

  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id } },
      { new: true }
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const parks = await Park.find({
    _id: { $in: req.user.hearts }  //finds an id that is found within an array
  });
  res.render('parks', { title: 'Hearted Parks', parks });
};

exports.getTopParks = async (req, res) => {
  const parks = await Park.getTopParks();
  res.render('topParks', { parks, title:'⭐ Top Parks!'});
}