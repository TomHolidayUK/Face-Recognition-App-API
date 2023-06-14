const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');


const knex = require('knex')
const db = knex({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  });


const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res)=> {
    res.send('slag')
})

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    // Validation - check that the user doesn't leave empty spaces
    if (!email || !password) {
        return res.status(400).json('Incorrect Form Submission');
    }
    db.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(data => {
            // Check password is correct
            const isValid = bcrypt.compareSync(password, data[0].hash);
            if (isValid) {
                return db.select('*').from('users')
                .where('email', '=', email)
                .then(user => {
                    res.json(user[0])
                })
                .catch(err => res.status(400).json('Unable to Get User'))
            } else {
                res.status(400).json('Wrong Credentials')
            }
        })
        .catch(err => res.status(400).json('Wrong Credentials'))
})

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    // Validation - check that the user doesn't leave empty spaces
    if (!email || !name || !password) {
        return res.status(400).json('Incorrect Form Submission');
    }
    const hash = bcrypt.hashSync(password);
        // First we need to update 'login' via a transaction (so it is the same as 'users')
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
    .catch(err => res.status(400).json('Unable to Register'))
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    let found = false;
    db.select('*').from('users').where({
        id: id
    })
        .then(user => {
            if (user.length)
                res.json(user[0])
            else
                res.status(400).json('User not Found')
    })
    .catch(err => res.status(400).json('Error Getting User'))
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        // res.json(entries[0]);
        res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json('Unable to get entries'))
})


// app.listen(process.env.PORT || 3000, ()=> {
//     console.log(`app is running on port ${process.env.PORT}`); 
// })

app.listen(3000, ()=> {
    console.log('app is running on port 3000'); 
})





// git add .
// git commit -m "updating database"
// git push heroku main

// heroku logs --tail