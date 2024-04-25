// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert, defaultsTo, isnull } from '../utils/general';
import { canCreateApplicationFor } from '../utils/permissions';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const application_route = Router();

application_route.use(OptionalIdentificationMiddlewear);

// Create an application!
application_route.post('/', async (req, res) => {
    const logger = res.locals.logger;
    const userTargetId = req.body.userid;
    const tokenkey = res.locals.tokenkey;
    const isPublic = defaultsTo(req.body.public, false);
    const displayName = req.body.displayName;
    const description = req.body.description;
    const iconUri = req.body.iconUri;

    logger.info('Received request to create application');

    let allowed = false;
    if (!isnull(tokenkey)) allowed = await canCreateApplicationFor(tokenkey, tokenkey);
    if (!allowed) {
        logger.warn('Permission denied for actor to create application!');
        return res.status(401).json({ message: 'You are not allowed to create an application for the user!', targetUser: userTargetId });
    }

    try {
        logger.info('Attempting to create application record');
        
        const application = await dbcon.application.create({
            data: {
                isPublic: isPublic,
                displayName: displayName,
                description: description,
                icon_uri: iconUri
            }
        });

        logger.info('Application record created');
        return res.status(200).json({ message: 'Application created', refrence: application.id });
    } catch (e) {
        logger.warn('Failed to create application');
        return res.status(500).json({ message: 'Failed to create application!' });
    }
});

// application_route.get('/:id/', async (req, res) => {
//     const logger = res.locals.logger;
//     const userid: number = res.locals.userid;
//     const tokenkey = res.locals.tokenkey;
//     const applicationId = Number(assert(req.params.id));

//     logger.info(`Received request to get information on application (${applicationId})`);

//     let grants: ApplicationInfoAccess = ApplicationInfoAccessDefaultGrant;
//     if (isnull(tokenkey) && !isnull(userid)) grants = await whatApplicationInformationCanUserRead(userid, applicationId);
//     else if (!isnull(tokenkey)) grants = await whatApplicationInformationCanTokenRead(tokenkey, applicationId);

//     try {
//         logger.info('Attempting to fetch data from database');
//         const application = await dbcon.application.findUnique({
//             where: { id: applicationId },
//             select: { isPublic: grants.publicStatus, isInternal: grants.internalStatus, displayName: grants.displayName, description: grants.description, icon_uri: grants.icon_uri  }
//         });
//         logger.info('Fetched application data!');
//         return res.status(200).json({ message: 'Fetched application data!', data: application });
//     } catch(e) {
//         logger.warn('Failed to fetch application info!');
//         return res.status(500).json({ message: 'Unable to get application info!' });
//     }

// });

// Export the app :D
export default application_route;