const bcrypt = require('bcryptjs');
const usersCollection = require('../db').db().collection('users');
const md5 = require('md5');
const validator = require('validator');

class User {
    constructor (data, getAvatar) {
        this.data = data;
        this.errors = [];
        if(getAvatar === undefined) { getAvatar = false; }
        if(getAvatar) { this.getAvatar() }
    }

    validate() {
       return new Promise(async (resolve, reject) => {
        if(this.data.username === '') { this.errors.push('You must provide a username') };
        if(this.data.username != '' && !validator.isAlphanumeric(this.data.username)) { this.errors.push('Username can only contain letters and numbers.') };


        if(!validator.isEmail(this.data.email)) { this.errors.push('You must provide a valide email address.')};

        if(this.data.password ===  '') { this.errors.push('You must provide a password.')};
        if(this.data.password.length > 0 && this.data.password.length < 12) { this.errors.push('Password needs to be at least 12 characters.')};
        if(this.data.password.length > 50) { this.errors.push('Password cannot exceed 50 characters')};
        
        if(this.data.username.length > 0 && this.data.password.length < 3) { this.errors.push('Username needs to be at 3 characters.')};
        if(this.data.username.length > 30) { this.errors.push('Username cannot exceed 30 characters')};

        // Only if username is valid then check to see if it's already taken
        if(this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists) { this.errors.push('That username has already been taken.') }
        }

         // Only if email is valid then check to see if it's already taken
         if(validator.isEmail(this.data.email)) {
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if(emailExists) { this.errors.push('That email has already being used.') }
        }
            resolve()
        })
    }   

    cleanUp () {
        if(typeof(this.data.username) !== 'string') { this.data.username = ""; }
        if(typeof(this.data.email) !== 'string') { this.data.email = ""; }
        if(typeof(this.data.password) !== 'string') { this.data.password = ""; }

        // get rid of any bogus properties
        this.data = {
            username: this.data.username.trim().toLowerCase(),
            email: this.data.email.trim().toLowerCase(),
            password: this.data.password
        }
    }

         register () {
        
            return new Promise(async (resolve, reject) => {
            // step 1 - validate user data
            this.cleanUp()
            await this.validate();
    
            // step 2 - only if there are no validation errors, then save the user data into a database
            if(!this.errors.length) {
                // hash user password
                let salt = bcrypt.genSaltSync(10);
                this.data.password = bcrypt.hashSync(this.data.password, salt);
                await usersCollection.insertOne(this.data);
                this.getAvatar();
                resolve();
            } 
            else {
                reject(this.errors);
            }
        
        })
       
     
    }

    login () {
       return new Promise((resolve, reject) => {
            this.cleanUp();
            usersCollection.findOne({username: this.data.username})
            .then((attemptedUser) => {
                if(attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    this.data = attemptedUser;
                    this.getAvatar();
                    resolve('congrats')
                }
                else {
                    reject('invalid username/password')
                }
            })
            .catch(() => {
                reject('Please, try again later.')
            })
       });
    }

    getAvatar() {
        this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
    }
}



module.exports = User;
