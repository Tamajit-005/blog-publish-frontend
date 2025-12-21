import mongoose from 'mongoose';


const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
conn: typeof mongoose | null;
promise: Promise<typeof mongoose> | null;
}


declare global {
namespace NodeJS {
interface Global {
mongooseCache?: MongooseCache;
}
}
}


const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cache;


async function connectToDatabase(): Promise<typeof mongoose> {
if (cache.conn) {
return cache.conn;
}


if (!cache.promise) {
cache.promise = mongoose.connect(MONGODB_URI!).then((m) => m);
}


cache.conn = await cache.promise;
return cache.conn;
}


export default connectToDatabase;