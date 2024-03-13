import { expect, use, request } from 'chai';
import sha1 from 'sha1';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';
/* module to test api */

use(chaiHttp);
describe('test apis', () => {
  beforeEach(async () => {
    await dbClient.db.collection('users').deleteMany();
    await dbClient.db.collection('files').deleteMany();
  });

  it('GET /status', async () => {
    const res = await request(app).get(`/status`).send();
      expect(res.statusCode).to.be.equal(200);
      expect(res.body).to.deep.equal({ redis: true, db: true });
  });
  it('GET /stats', async () => {
    await dbClient.db.collection('users').insertOne({ email: 'bob@dylan.com', password: 'toto1234!' });
    await dbClient.db.collection('files').insertOne({ name: 'testFile' });
    const res = await request(app).get('/stats').send();
	expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.deep.equal({ users: 1, files: 1 });
  });

  it('POST /users', async () => {
    const data = { email: 'ahmedelsaeed105@gmail.com', password: 'ahmed105' };
    const res = await request(app).post('/users').send(data); 
    expect(res.statusCode).to.be.equal(201);
    expect(res.body.email).to.be.equal('ahmedelsaeed105@gmail.com');
  });

  it('POST /users { errors }', async () => {
    let data;
    let res;
    data = { password: 'ahmed105' };
    res = await request(app).post('/users').send(data); 
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Missing email' });

    await dbClient.db.collection('users').insertOne({ email: 'bob@dylan.com', password: 'toto1234!' });
    data = { email: 'bob@dylan.com' , password: 'ahmed' };
    res = await request(app).post('/users').send(data); 
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Already exist' });

    data = { email: 'mark@gmail.com'};
    res = await request(app).post('/users').send(data); 
    expect(res.statusCode).to.be.equal(400);
    expect(res.body).to.deep.equal({ error: 'Missing password' });
	});

  it('GET /connect', async () => {
    await dbClient.db.collection('users').insertOne({ email: 'bob@dylan.com', password: sha1('toto1234!') });
    const res = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send(); 
    expect(res.statusCode).to.be.equal(200);
    expect(res.body.token).to.be.a('string');
  });

  it('GET /disconnect', async () => {
    await dbClient.db.collection('users').insertOne({ email: 'bob@dylan.com', password: sha1('toto1234!') });
    const connectresponse = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send(); 
    const token = connectresponse.body.token;
    const res = await request(app).get('/disconnect').set('x-token', token).send();
    expect(res.statusCode).to.be.equal(204);
    expect(res.text).to.be.equal('');
  });

  it('GET /users/me', async () => {
    await dbClient.db.collection('users').insertOne({ email: 'bob@dylan.com', password: sha1('toto1234!') });
    const connectresponse = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=').send();
    const { token } = connectresponse.body;
    const res = await request(app).get('/users/me').set('x-token', token).send();
    expect(res.statusCode).to.be.equal(200);
    expect(res.body.email).to.be.equal('bob@dylan.com');
  });
});
