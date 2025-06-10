const items = require('./routes/items');
const dashboardRoutes = require('./routes/dashboard');
 
// Mount routers
app.use('/api/items', items);
app.use('/api/dashboard', dashboardRoutes); 