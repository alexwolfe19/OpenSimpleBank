// Imports
import Express from 'express';
import api_route from './routes/apis';

// Create application
const app = Express();

// Connect our routes
app.use('/api/', api_route);

// Serve static content, unless disabled
console.log('Exposing static content!');
app.use(Express.static('./public'));

function start(callback: (app: Express.Application) => void) {
    app.listen(process.env.PORT || 3000, () => {
        callback(app);
    });
}

export {start};
export default app;