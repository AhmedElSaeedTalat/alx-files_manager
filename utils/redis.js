import { createClient } from 'redis';
import { promisify } from 'util';
/* redis client */

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.log(err);
    });
  }

  /*
   * @isAlive()
   *
   * Function - to check if client is connected
   *
   * @return {boolean}
   *
   */
  isAlive() {
    return this.client.connected;
  }

  /*
   * get()
   *
   * @key: passed key to get the value in redis
   *
   * @return - value for the passed key
   *
   */
  async get(key) {
    const gt = promisify(this.client.get).bind(this.client);
    return gt(key);
  }

  /*
   * set()
   *
   * set value for key with an expiration date
   *
   * @key: passed key to set value for
   * @value: passed value to set for the key
   * @duration: expiration for the key-value set
   *
   */
  async set(key, value, duration) {
    const st = promisify(this.client.set).bind(this.client);
    st(key, value, 'EX', duration);
  }

  /*
   * del(key)
   *
   * deletes key from redis
   *
   * @key: passed key to delete
   *
   */
  async del(key) {
    this.client.del(key);
  }
}
const redisClient = new RedisClient();
module.exports = redisClient;
