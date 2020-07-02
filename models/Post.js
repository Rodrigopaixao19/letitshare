const postCollections = require('../db').db().collection('posts');
const followsCollections = require('../db').db().collection('follows');
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

class Post {
    constructor(data, userid, requestedPostId) {
        this.data = data;
        this.errors = [];
        this.userid = userid;
        this.requestedPostId = requestedPostId;
    }

    cleanUp () {
        if(typeof(this.data.title) !== 'string') { this.data.title = ''; }
        if(typeof(this.data.body) !== 'string')  { this.data.body = '';  }
        

        // get rid of any bogus properties
        this.data = {
            title: sanitizeHTML(this.data.title.trim(), { allowedTags: [], allowedAttributes: {} }),
            body: sanitizeHTML(this.data.body.trim(), { allowedTags: [], allowedAttributes: {} }),
            createdDate: new Date(),
            author: ObjectID(this.userid)
        }
    }

    validate () {
        if(this.data.title === '') { this.errors.push('You must provide a title')};
        if(this.data.body === '')  { this.errors.push('You must provide a post content') };
    }

    create () {
        return new Promise((resolve, reject) => {
            this.cleanUp();
            this.validate();
            if(!this.errors.length) { // if errors array is empty then...
                // save the post into the database
                postCollections.insertOne(this.data)
                .then((info) => {
                   resolve(info.ops[0]._id) 
                })
                .catch(() => {
                   this.errors.push('Please try again later.');
                   reject(this.errors);
                })
                
            } else {
                // if there are validators errors
                reject(this.errors);
            }
        });
    }

    update() {
      return new Promise( async (resolve, reject) => {
        try {
          let post = await Post.findSingleById(this.requestedPostId, this.userid);
          if(post.isVisitorOwner) {
            // actually update the DB
            let status = await this.actuallyUpdate();
            resolve(status);
          }
          else {
            reject();
          }
        } catch {
          reject();
        }
      })
    }

    actuallyUpdate() {
      return new Promise(async(resolve, reject) => {
        this.cleanUp();
        this.validate();
        if(!this.errors.length) {
         await postCollections.findOneAndUpdate({ _id: new ObjectID(this.requestedPostId) }, { $set: { title: this.data.title, body: this.data.body } })
         resolve('success');
        }
        else {
          resolve('failure');
        }
      })
    }
}


Post.reusablePostQuery = function(uniqueOperations, visitorId) {
    return new Promise(async function(resolve, reject) {
      let aggOperations = uniqueOperations.concat([
        {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
        {$project: {
          title: 1,
          body: 1,
          createdDate: 1,
          authorId: '$author',
          author: {$arrayElemAt: ["$authorDocument", 0]}
        }}
      ])
  
      let posts = await postCollections.aggregate(aggOperations).toArray()
  
      // clean up author property in each post object
      posts = posts.map(function(post) {
        post.isVisitorOwner = post.authorId.equals(visitorId)
        post.authorId =  undefined
        
        post.author = {
          username: post.author.username,
          avatar: new User(post.author, true).avatar
        }
  
        return post
      })
  
      resolve(posts)
    })
  }

Post.findSingleById = (id, visitorId) => {
    return new Promise(async function(resolve, reject) {
      if (typeof(id) !== "string" || !ObjectID.isValid(id)) {
        reject()
        return
      }
      
      let posts = await Post.reusablePostQuery([
        {$match: {_id: new ObjectID(id)}}
      ], visitorId)
  
      if (posts.length) {
        console.log(posts[0])
        resolve(posts[0])
      } else {
        reject()
      }
    })
  }

Post.findByAuthorId = (authorId) => {
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}}

    ])
}

Post.delete = (postIdToDelete, currentUserId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let post = await Post.findSingleById(postIdToDelete, currentUserId);
        if(post.isVisitorOwner) {
          await postCollections.deleteOne( { _id: new ObjectID(postIdToDelete) });
          resolve();
        }
        else {
          reject()
        }
      } catch {
        reject()
      }
    })
}

Post.search = (searchTerm) => {
  return new Promise(async(resolve, reject) => {
    if(typeof(searchTerm) == 'string') {
      let posts = await Post.reusablePostQuery([
        {$match: {$text: { $search: searchTerm }}},
        {$sort: {$score: {$meta: 'textScore'}}}
      ]);
      resolve(posts)
    }
    else {
      reject()
    }
  })
}

Post.countPostsByAuthor = (id) => {
  return new Promise(async(resolve, reject) => {
    let postCount = await postCollections.countDocuments({author: id});
    resolve(postCount)
  })
}

Post.getFeed = async (id) => {
  // create an array of the user ids that the current user follows
  let followedUsers = await followsCollections.find({authorId: new ObjectID(id)}).toArray();
  followedUsers = followedUsers.map((followDoc) => {
    return followDoc.followedId;
  })

  // look for posts where the author is in the above array of followed users
  return Post.reusablePostQuery([
    {$match: {author: {$in:followedUsers}}},
    {$sort: {createdDate: -1}}
  ])
}

module.exports = Post;