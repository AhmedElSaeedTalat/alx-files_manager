import {
  it,
  describe,
  before,
  after,
} from 'mocha';
import { expect, use, request } from 'chai';
import { MongoClient } from 'mongodb';
import chaiHttp from 'chai-http';
import app from '../server';
/* module to test api */

use(chaiHttp);
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
let client;
let db;
describe('test apis', () => {
  /*
   * @before: hook to define database and insert
   * values in db for the sake of the tests
   *
   */
  before(async () => {
    const uri = `mongodb://${host}:${port}`;
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect(async (err) => {
      if (!err) {
        db = client.db(database);
        await db.collection('users').insertOne({ email: 'fake user' });
        await db.collection('files').insertOne({ name: 'fake file' });
      }
    });
  });

  /*
   * @after: hook to delete data inserted in db
   * after the tests were done
   *
   */
  after(async () => {
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
  });

  /*
   * @it: test to { /status } api to confirm db and redis
   * are connected
   *
   */
  it('GET /status', async () => {
    const res = await request(app).get('/status').send();
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.deep.equal({ redis: true, db: true });
  });

  /*
   * @it: test to { /stats } api to confirm number of docs
   * that are created in db
   *
   */
  it('GET /stats', async () => {
    const res = await request(app).get('/stats').send();
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.deep.equal({ users: 1, files: 1 });
  });
});
