import redisClient from '../utils/redis';
import dbClient from '../utils/db';
/* controller module */

class AppController {
  static getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.json({ redis: true, db: true });
    }
  }

  static async getStats(req, res) {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();
    res.json({ users: numUsers, files: numFiles });
  }
}
module.exports = AppController;
