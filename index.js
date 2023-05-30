const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res , next) => {
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }

  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }

    req.decoded = decoded
    next();
  })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gkz5fmx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const menuCollection = client.db('bistroBossDB').collection('menu')
    const usersCollection = client.db('bistroBossDB').collection('users')
    const reviewsCollection = client.db('bistroBossDB').collection('reviews')
    const cartCollection = client.db('bistroBossDB').collection('cart')


    // jwt related apis

    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    // users related apis

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exist' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // menu related apis

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result)
    })

    // review related apis

    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray()
      res.send(result)
    })

    // cart collection related apis

    app.get('/cart', verifyJWT, async (req, res) => {
      const email = req.query.email
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
      }

      const query = { email: email }
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/cart', async (req, res) => {
      const item = req.body;
      // console.log(item)
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/cart/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Bistro boss server is running now')
})

app.listen(port, () => {
  console.log(`server is running on port ${port}`)
})