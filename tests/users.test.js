import {
  it,
  describe,
  before,
  after,
} from 'mocha';
import { MongoClient } from 'mongodb';
import { expect, use, request } from 'chai';
import sha1 from 'sha1';
import chaiHttp from 'chai-http';
import app from '../server';
/* module to test api */

use(chaiHttp);
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
let client;
let db;
describe('test users', () => {
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
        await db.collection('users').insertOne({ email: 'bob@dylan.com', password: sha1('toto1234!') });
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
   * @test: test posting new user and confirming
   * response containing user inserted
   *
   *
   */
  it('post /users', async () => {
    const data = { email: 'ahmedelsaeed105@gmail.com', password: sha1('ahmed105') };
    const res = await request(app).post('/users').send(data);
    expect(res.statusCode).to.be.equal(201);
    expect(res.body.email).to.be.equal('ahmedelsaeed105@gmail.com');
  });

  /*
   * @test: test posting users to check for different
   * errors: including missing email, password, or already
   * inserted user
   *
   */
  it('post /users { errors }', async () => {
    let data;
    let res;
    data = { password: 'ahmed105' };
    res = await request(app).post('/users').send(data);
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Missing email' });

    data = { email: 'bob@dylan.com', password: sha1('ahmed') };
    res = await request(app).post('/users').send(data);
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Already exist' });

    data = { email: 'mark@gmail.com' };
    res = await request(app).post('/users').send(data);
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Missing password' });
  });

  /*
   * @test: connect with authorization to get token
   * confirming token received by checking if response
   * is a string
   *
   *
   */
  it('get /connect', async () => {
    const res = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send();
    expect(res.statusCode).to.be.equal(200);
    expect(res.body.token).to.be.a('string');
  });

  /*
   * @test: desconnect function to remove user from
   * redis while setting token in the header for
   * authentication
   *
   *
   */
  it('GET /disconnect', async () => {
    const connectresponse = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send();
    const { token } = connectresponse.body;
    const res = await request(app).get('/disconnect').set('x-token', token).send();
    expect(res.statusCode).to.be.equal(204);
    expect(res.text).to.be.equal('');
  });

  /*
   * @test: get user docment and confirm response
   * contains email
   *
   *
   */
  it('GET /users/me', async () => {
    const connectresponse = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send();
    const { token } = connectresponse.body;
    const res = await request(app).get('/users/me').set('x-token', token).send();
    expect(res.statusCode).to.be.equal(200);
    expect(res.body.email).to.be.equal('bob@dylan.com');
  });
});
