const Post = require('../models/Post');


exports.viewCreateScreen = (req, res) => {
    res.render('create-post')
}

exports.create = (req, res) => {
    let post = new Post(req.body);
    post.create()
}