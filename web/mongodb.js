import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI; // e.g. mongodb+srv://user:pass@cluster/...
const dbName = process.env.MONGODB_DB || "scroll2top";
const collectionName = "shopify_sessions"; // must match MongoDBSessionStorage's collection

let client;

export const connectToMongoDB = async () => {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB for session storage");
  }
  return client.db(dbName).collection(collectionName);
};
