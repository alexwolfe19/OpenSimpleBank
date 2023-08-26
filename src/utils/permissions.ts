// Imports
import { Permission, PrismaClient } from '@prisma/client';
import { isnull } from './general';

// Get database connection
const dbcon = new PrismaClient();

// Types
type UserRefrence = string | number;

export type ApplicationInfoAccess = {
    publicStatus: boolean,
    internalStatus: boolean,
    displayName: boolean,
    description: boolean,
    icon_uri: boolean
};

export type UserInfoAccess = {
    username : boolean,
    createdOn : boolean,
    email : boolean,
    defaultApplicationId : boolean,
    tokenList : boolean,
    sessionList : boolean,
    membershipList : boolean
};

// Defaults
export const ApplicationInfoAccessDefaultGrant: ApplicationInfoAccess = {
    publicStatus: true, 
    internalStatus: false, 
    displayName: true, 
    description: true, 
    icon_uri: true
};

export const UserInfoAccessDefaultGrant = {
    username: true, 
    createdOn: true, 
    email: false, 
    defaultApplicationId: false, 
    tokenList: false, 
    sessionList: false, 
    membershipList: false
};


// Methods
export async function doesUserHavePermission() {
    
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserLogin(user: UserRefrence) : Promise<boolean> {    
    try {
        let targetUserId: number = Number(user);

        if (typeof(user) == 'string') {
            const tub = await dbcon.userAccount.findUnique({ where: {username: user} });
            if (isnull(tub)) throw new Error();
            targetUserId = tub!.id;
        }

        const User = await dbcon.userAccount.findUnique({ where: { id: targetUserId } });

        if (isnull(User)) return false;
        return User!.canLogin;
    } catch (e) {
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserCreateAccountFor(application: string, user: UserRefrence) : Promise<boolean> {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenCreateAccountFor(application: string, identity: string) : Promise<boolean> {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function whatUserInfoCanUserRead(userId: number, target: UserRefrence) : Promise<UserInfoAccess> {
    // console.log('Getting user information available for reading.', userId, target);
    let targetId: number = Number(target);

    if (typeof(target) == 'string') {
        if (target == '@me') targetId = userId;
        else {
            const User = await dbcon.userAccount.findUnique({ where: { username: target } });
            if (isnull(User)) throw new Error();
            targetId = User!.id;
        }
    }

    if (targetId == userId) return {
        username: true,
        createdOn: true,
        email: true,
        defaultApplicationId: true,
        tokenList: true,
        sessionList: true,
        membershipList: true
    };

    // console.log('Searching for permission records...');
    const permissions = await dbcon.permissionRecord.findFirst({ where: {
        targetUserId: targetId,
        userId: userId
    }});
    if (isnull(permissions)) return UserInfoAccessDefaultGrant;
    const permissionList = permissions!.permissions;

    // console.log('Getting USER_READ_ACCESS', userId, targetId);

    const hasAllPermission = permissionList.includes(Permission.ALL) || targetId == userId;

    return {
        username: hasAllPermission || permissionList.includes(Permission.ACCOUNT_READ_USERNAME),
        createdOn: hasAllPermission || permissionList.includes(Permission.ACCOUNT_READ_CREATION),
        email: hasAllPermission || permissionList.includes(Permission.ACCOUNT_READ_EMAIL),
        defaultApplicationId: hasAllPermission || permissionList.includes(Permission.ACCOUNT_READ_DEFAULT_APPLICATION),
        tokenList: hasAllPermission || permissionList.includes(Permission.ACCOUNT_TOKENS_LIST),
        sessionList: hasAllPermission || permissionList.includes(Permission.ACCOUNT_SESSION_LIST),
        membershipList: hasAllPermission || permissionList.includes(Permission.ACCOUNT_MEMBERSHIP_LIST)
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function whatUserInfoCanTokenRead(identity: string, username: string) : Promise<UserInfoAccess> {
    


    return {
        username: true,
        createdOn: true,
        email: true,
        defaultApplicationId: true,
        tokenList: true,
        sessionList: true,
        membershipList: true
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserCreateCurrencyFor(user: UserRefrence, applicationid: number) : Promise<boolean> {
    let userId: number = Number(user);

    if (typeof(user) == 'string') {
        const filter = (user == 'me') ? { id: userId } : { username: user };
        const tub = await dbcon.userAccount.findUnique({ where: filter });
        if (isnull(tub)) throw new Error();
        userId = tub!.id;
    }

    const permissions = await dbcon.permissionRecord.findFirst({ where: {
        userId: userId,
        applicationId: applicationid
    }});


    if (isnull(permissions)) return false;
    const permissionList = permissions!.permissions;
    
    const hasAllPermission = permissionList.includes(Permission.ALL);
    const canCreateCurrency = permissionList.includes(Permission.CURRENCY_CREATE);
    const allowed = hasAllPermission || canCreateCurrency;

    return allowed;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenCreateCurrencyFor(identity: string, applicationid: string) : Promise<boolean> {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserBeginTransactionFor(user: UserRefrence, walletid: string) : Promise<boolean> {
    let userId: number = Number(user);

    if (typeof(user) == 'string') {
        const filter = (user == 'me') ? { id: userId } : { username: user };
        const tub = await dbcon.userAccount.findUnique({ where: filter });
        if (isnull(tub)) throw new Error();
        userId = tub!.id;
    }

    const permissions = await dbcon.permissionRecord.findFirst({ where: { userId: userId, targetWalletId: walletid }});
    if (isnull(permissions)) return false;
    const permissionList = permissions!.permissions;
    const allowed = permissionList.includes(Permission.ALL) || permissionList.includes(Permission.TRANSACTION_CREATE);
    return allowed;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenBeginTransactionFor(identity: string, walletid: string) : Promise<boolean> {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canUserCreateApplicationForSelf(user: UserRefrence) : Promise<boolean> {
    try {
        let targetUserId: number = Number(user);

        if (typeof(user) == 'string') {
            const tub = await dbcon.userAccount.findUnique({ where: {username: user} });
            if (isnull(tub)) throw new Error();
            targetUserId = tub!.id;
        }

        const User = await dbcon.userAccount.findUnique({ where: { id: targetUserId } });

        if (isnull(User)) return false;
        return User!.canCreateUserApplications;
    } catch (e) {
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenCreateApplicationForUser(identity: string, user: UserRefrence) : Promise<boolean> {
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function whatApplicationInformationCanUserRead(user: UserRefrence, applicationid: number) : Promise<ApplicationInfoAccess> {
    let userId: number = Number(user);

    if (typeof(user) == 'string') {
        const filter = (user == 'me') ? { id: Number(user) } : { username: user };
        const tub = await dbcon.userAccount.findUnique({ where: filter });
        if (isnull(tub)) throw new Error();
        userId = tub!.id;
    }

    const permissions = await dbcon.permissionRecord.findFirst({ where: {
        userId: userId,
        applicationId: applicationid
    }});

    if (isnull(permissions)) return ApplicationInfoAccessDefaultGrant;
    const permissionList = permissions!.permissions;

    const hasAllPermission = permissionList.includes(Permission.ALL);

    return {
        publicStatus: hasAllPermission || permissionList.includes(Permission.APPLICATION_INFO_READ_ISPUBLIC),
        internalStatus: hasAllPermission || permissionList.includes(Permission.APPLICATION_INFO_READ_ISINTERNAL),
        displayName: hasAllPermission || permissionList.includes(Permission.APPLICATION_INFO_READ_NAME),
        description: hasAllPermission || permissionList.includes(Permission.APPLICATION_INFO_READ_DESCRIPTION),
        icon_uri: hasAllPermission || permissionList.includes(Permission.APPLICATION_INFO_READ_IMAGE_URI)
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function whatApplicationInformationCanTokenRead(identity: string, applicationid: number) : Promise<ApplicationInfoAccess> {
    return ApplicationInfoAccessDefaultGrant;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * So, there's an issue.
 * I don't explicitly create a permission grant for each sub-resouce of the application.
 * A user by default has the ALL grant on their application... which this doesn't even
 * check for. How the hell was this working before?
 * 
 */

export async function canUserMakeGrantFromCurrency(user: UserRefrence, currencyAddress: string) : Promise<boolean> {
    try {
        let userId: number = Number(user);

        if (typeof(user) == 'string') {
            const filter = (user == 'me') ? { id: userId } : { username: user };
            const tub = await dbcon.userAccount.findUnique({ where: filter });
            if (isnull(tub)) throw new Error();
            userId = tub!.id;
        }

        const permissions = await dbcon.permissionRecord.findFirst({ where: { userId: userId, targetCurrencyId: currencyAddress }});
        if (isnull(permissions)) return false;
        const permissionList = permissions!.permissions;
        const allowed = permissionList.includes(Permission.ALL) || permissionList.includes(Permission.CURRENCY_ISSUE_GRANT);
        return allowed;
    } catch (e) {
        return false;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function canTokenMakeGrantFromCurrency(identity: string, currencyAddress: string) : Promise<boolean> {
    return false;
}