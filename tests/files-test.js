import {
  it,
  describe,
  before,
  after,
  beforeEach,
} from 'mocha';
import fs from 'fs';
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
let token;
describe('test files', () => {
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

  beforeEach(async () => {
    const connectresponse = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send();
    token = connectresponse.body.token;
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
   * @test: to check if the file is created
   * and a document is created when post
   * request is made
   *
   */
  it('post /files', async () => {
    const data = { name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
    const response = await request(app).post('/files').set('x-token', token).send(data);
    expect(response.statusCode).to.be.equal(201);
    expect(response.body.name).to.be.equal('myText.txt');
    const { name } = response.body;
    const doc = await db.collection('files').findOne({ name });
    try {
      await fs.promises.access(doc.localPath, fs.constants.F_OK);
    } catch (err) {
      throw new Error(err);
    }
  });

  /*
   * @test: to check if the file is created
   * and a document is created when post
   * request is made check { errors }
   *
   */
  it('post /files', async () => {
    let data;
    let response;
    // missing data
    data = { name: 'myText.txt', type: 'file' };
    response = await request(app).post('/files').set('x-token', token).send(data);
    expect(response.statusCode).to.be.equal(400);
    expect(response.body).to.deep.equal({ error: 'Missing data' });
    // missing type
    data = { name: 'myText.txt', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
    response = await request(app).post('/files').set('x-token', token).send(data);
    expect(response.statusCode).to.be.equal(400);
    expect(response.body).to.deep.equal({ error: 'Missing type' });
    // test non folder parent id passed error
    data = { name: 'file.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
    response = await request(app).post('/files').set('x-token', token).send(data);
    const { id } = response.body;
    data = {
      name: 'file2.txt',
      type: 'file',
      data: 'SGVsbG8gV2Vic3RhY2shCg==',
      parentId: id,
    };
    response = await request(app).post('/files').set('x-token', token).send(data);
    expect(response.statusCode).to.be.equal(400);
    expect(response.body).to.deep.equal({ error: 'Parent is not a folder' });
  });
});
