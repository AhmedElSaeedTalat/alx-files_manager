import AppController from '../controllers/AppController';
/* routes module */
const routes = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
};
module.exports = routes;
