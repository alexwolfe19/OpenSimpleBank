// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert, defaultsTo, isnull } from '../utils/general';
import { ApplicationInfoAccess, ApplicationInfoAccessDefaultGrant, canTokenCreateApplicationForUser, canUserCreateApplicationForSelf, whatApplicationInformationCanTokenRead, whatApplicationInformationCanUserRead } from '../utils/permissions';

// Get database connection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbcon = new PrismaClient();

// Create our apps
const application_route = Router();

application_route.use(OptionalIdentificationMiddlewear);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
application_route.post('/', async (req, res) => {
    const userid: number = res.locals.userid;
    const userTargetId = req.body.userid;
    const tokenkey = res.locals.tokenkey;
    const isPublic = defaultsTo(req.body.public, false);
    const displayName = req.body.displayName;
    const description = req.body.description;
    const iconUri = req.body.iconUri;

    let allowed = false;
    if (isnull(tokenkey) && !isnull(userid)) allowed = await canUserCreateApplicationForSelf(userid);
    if (!isnull(tokenkey)) allowed = await canTokenCreateApplicationForUser(tokenkey, userTargetId);
    if (!allowed) return res.status(401).json({ message: 'You are not allowed to create an application for the user!', targetUser: userid });

    try {
        const application = await dbcon.application.create({
            data: {
                isPublic: isPublic,
                displayName: displayName,
                description: description,
                icon_uri: iconUri
            }
        });

        return res.status(200).json({ message: 'Application created', refrence: application.id });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to create application!' });
    }
});

application_route.get('/:id/', async (req, res) => {
    const userid: number = res.locals.userid;
    const tokenkey = res.locals.tokenkey;
    const applicationId = Number(assert(req.params.id));

    let grants: ApplicationInfoAccess = ApplicationInfoAccessDefaultGrant;
    if (isnull(tokenkey) && !isnull(userid)) grants = await whatApplicationInformationCanUserRead(userid, applicationId);
    else if (!isnull(tokenkey)) grants = await whatApplicationInformationCanTokenRead(tokenkey, applicationId);

    try {
        const application = await dbcon.application.findUnique({
            where: { id: applicationId },
            select: { isPublic: grants.publicStatus, isInternal: grants.internalStatus, displayName: grants.displayName, description: grants.description, icon_uri: grants.icon_uri  }
        });
        return res.status(200).json({ message: 'Fetched application data!', data: application });
    } catch(e) {
        return res.status(500).json({ message: 'Unable to get application info!' });
    }

});

// Export the app :D
export default application_route;