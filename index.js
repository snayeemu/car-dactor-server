const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ttlimcj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization)
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err)
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });

    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    const database = client.db("carDoctor");
    const services = database.collection("services");
    const bookingCollection = database.collection("bookings");

    // services routes
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const aService = await services.findOne(query, options);
      res.send(aService);
    });

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        {
          user,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({
        token,
      });
    });

    // bookings
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email)
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });

      console.log("comeback after verify", decoded);
      let query = {};
      if (req.query?.email) query = { email: req.query?.email };

      const bookings = bookingCollection.find(query);
      const result = await bookings.toArray();
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      const allServices = services.find();
      const result = await allServices.toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const doc = req.body;
      const result = await bookingCollection.insertOne(doc);
      console.log(doc);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: { status: updatedBooking.status },
      };
      const result = await bookingCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctor is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
