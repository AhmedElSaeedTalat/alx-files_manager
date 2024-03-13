import { MongoClient } from 'mongodb';
/* db client to connect to db */

class DBClient {
  constructor() {
    // env variablse
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    // url for connection and connection
    const uri = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    // connect
    this.client.connect((err) => {
      if (err) {
        console.log(err);
      } else {
        this.db = this.client.db(this.database);
      }
    });
  }

  /*
   * isAlive()
   *
   * @return - { boolean } whether db is connected or not
   *
   */
  isAlive() {
    return Boolean(this.db);
  }

  /*
   * nbUsers
   *
   * @return - {int} number of documents in a collection
   *
   */
  async nbUsers() {
    if (!this.db) {
      return 'error';
    }
    return this.db.collection('users').countDocuments();
  }

  /*
   * nbFiles
   *
   * @return - {int} number of documents in a collection
   *
   */
  async nbFiles() {
    if (!this.db) {
      return 'error';
    }
    return this.db.collection('files').countDocuments();
  }
}
const dbClient = new DBClient();
module.exports = dbClient;
