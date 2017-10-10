const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/Cloud_SMS', {
    useMongoClient: true
});
//mongoose.set('debug', true);

module.exports = {
    mongoose
};