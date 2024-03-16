import { before, it, describe } from 'mocha';
import { expect, use, request } from 'chai';
import sha1 from 'sha1';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';
/* module to test api */
use(chaiHttp);


describe('test files', () => {
  before(async () => {
    
  });
  it('post /files', () => {
  });
});
